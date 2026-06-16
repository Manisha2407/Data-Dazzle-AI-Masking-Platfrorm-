import { client, DOCUMENTS_INDEX, ENTITIES_INDEX, AUDIT_INDEX } from '../utils/elastic.js';

const searchDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      q = '',
      entityType,
      entityText,
      fileType,
      redactionMethod,
      minEntities,
      maxEntities,
      minSensitivity,
      maxSensitivity,
      minConfidence,
      dateFrom,
      dateTo,
      page     = 1,
      pageSize = 9,
    } = req.query;

    const from    = (parseInt(page) - 1) * parseInt(pageSize);
    const filters = [{ term: { userId } }];

    if (fileType)        filters.push({ term: { fileType } });
    if (redactionMethod) filters.push({ term: { redactionMethod } });
    if (minEntities)     filters.push({ range: { totalEntities: { gte: parseInt(minEntities) } } });
    if (maxEntities)     filters.push({ range: { totalEntities: { lte: parseInt(maxEntities) } } });
    if (minSensitivity)  filters.push({ range: { sensitivityScore: { gte: parseInt(minSensitivity) } } });
    if (maxSensitivity)  filters.push({ range: { sensitivityScore: { lte: parseInt(maxSensitivity) } } });
    if (minConfidence)   filters.push({ range: { confidenceThreshold: { gte: parseInt(minConfidence) } } });
    if (dateFrom || dateTo) {
      const range = {};
      if (dateFrom) range.gte = dateFrom;
      if (dateTo)   range.lte = dateTo;
      filters.push({ range: { createdAt: range } });
    }

    // If searching by entity type or entity text, find matching documentIds from entities index first
    let entityDocumentIds = null;
    if (entityType || entityText) {
      const entityFilters = [{ term: { userId } }];
      if (entityType) entityFilters.push({ term: { entityType } });
      if (entityText) {
        entityFilters.push({
          bool: {
            should: [
              {
                match: {
                  entityText: {
                    query: entityText,
                    fuzziness: 'AUTO',
                  },
                },
              },
            
              {
                wildcard: {
                  'entityText.keyword': `*${entityText.toLowerCase()}*`,
                },
              },
            ],
          
            minimum_should_match: 1,
          },
        });
      }
      console.log('FILE TYPE FILTER:', fileType);
      console.log('FILTERS:', JSON.stringify(filters, null, 2));
      const entityResult = await client.search({
        index: ENTITIES_INDEX,
        size:  10000,
        query: { bool: { filter: entityFilters } },
        _source: ['documentId'],
      });

      entityDocumentIds = [...new Set(entityResult.hits.hits.map(h => h._source.documentId))];
      if (entityDocumentIds.length === 0) {
        return res.status(200).json({
          results: [], total: 0, page: parseInt(page),
          pageSize: parseInt(pageSize), totalPages: 0,
          aggregations: { entityTypes: [], fileTypes: [], avgSensitivity: 0, sensitivityRanges: [] },
        });
      }
      filters.push({ terms: { documentId: entityDocumentIds } });
    }

    const mustQuery = q.trim()
  ? {
      bool: {
        should: [
          {
            multi_match: {
              query: q.trim(),
              fields: ['filename^3', 'redactedText^2'],
              fuzziness: 'AUTO',
            },
          },

          {
            wildcard: {
              'filename.keyword': `*${q.trim().toLowerCase()}*`,
            },
          },
        ],

        minimum_should_match: 1,
      },
    }
  : { match_all: {} };
      
console.log('QUERY:', q);
console.log('FILE TYPE:', fileType);
console.log('FILTERS:', JSON.stringify(filters, null, 2));
console.log('MUST QUERY:', JSON.stringify(mustQuery, null, 2));
    const response = await client.search({
      index: DOCUMENTS_INDEX,
      from,
      size: parseInt(pageSize),
    
      query: {
        bool: {
          must: mustQuery,
          filter: filters,
        },
      },
    
      highlight: q.trim()
        ? {
            fields: {
              filename: {},
            
              redactedText: {
                fragment_size: 150,
                number_of_fragments: 3,
                max_analyzed_offset: 1000000,
              },
            },
          
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
          }
        : undefined,
        
      sort: q.trim()
        ? ['_score', { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
        
      aggs: {
        by_file_type: {
          terms: {
            field: 'fileType',
          },
        },
      
        avg_sensitivity: {
          avg: {
            field: 'sensitivityScore',
          },
        },
      
        sensitivity_ranges: {
          range: {
            field: 'sensitivityScore',
          
            ranges: [
              {
                key: 'low',
                from: 0,
                to: 30,
              },
            
              {
                key: 'medium',
                from: 30,
                to: 60,
              },
            
              {
                key: 'high',
                from: 60,
                to: 100,
              },
            ],
          },
        },
      },
    });

    console.log('TOTAL HITS:', response.hits.total);
console.log('FIRST HIT:', JSON.stringify(response.hits.hits[0], null, 2));

    const hits = response.hits.hits.map(hit => ({
      ...hit._source,
      score:      hit._score,
      highlights: hit.highlight || {},
    }));

    return res.status(200).json({
      results:   hits,
      total:     response.hits.total.value,
      page:      parseInt(page),
      pageSize:  parseInt(pageSize),
      totalPages: Math.ceil(response.hits.total.value / parseInt(pageSize)),
      aggregations: {
        fileTypes:         response.aggregations.by_file_type.buckets,
        avgSensitivity:    Math.round(response.aggregations.avg_sensitivity.value || 0),
        sensitivityRanges: response.aggregations.sensitivity_ranges.buckets,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getEntitySuggestions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { q = '', entityType } = req.query;

    if (!q.trim()) {
      return res.status(200).json({ suggestions: [] });
    }

    const filters = [
      { term: { userId } }
    ];

    if (entityType) {
      filters.push({ term: { entityType } });
    }

    const response = await client.search({
      index: ENTITIES_INDEX,
      size: 100,

      query: {
        bool: {
          must: {
            bool: {
              should: [
                {
                  wildcard: {
                    'entityText.keyword': {
                      value: `*${q.trim().toLowerCase()}*`,
                      boost: 2
                    }
                  }
                },

                {
                  match: {
                    entityText: {
                      query: q.trim(),
                      fuzziness: 'AUTO',
                      boost: 3
                    }
                  }
                }
              ],

              minimum_should_match: 1
            }
          },

          filter: filters
        }
      },

      sort: [
        '_score',
        { createdAt: 'desc' }
      ],

      _source: [
        'entityText',
        'entityType'
      ]
    });

    const seen = new Set();

    const suggestions = response.hits.hits
      .map(h => h._source.entityText)
      .filter(text => {
        const key = text.toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .map(text => ({
        text,
        count: 1,
        score:
          text.includes('@') || text.includes('.com')
            ? 1
            : 3
      })).sort((a, b) => b.score - a.score).slice(0, 10)
      .map(({ text, count }) => ({
        text,
        count
      }));

    return res.status(200).json({ suggestions });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20, action, dateFrom, dateTo } = req.query;
    const from    = (parseInt(page) - 1) * parseInt(pageSize);
    const filters = [{ term: { userId } }];

    if (action) filters.push({ term: { action } });
    if (dateFrom || dateTo) {
      const range = {};
      if (dateFrom) range.gte = dateFrom;
      if (dateTo)   range.lte = dateTo;
      filters.push({ range: { timestamp: range } });
    }

    const response = await client.search({
      index: AUDIT_INDEX,
      from,
      size:  parseInt(pageSize),
      query: { bool: { filter: filters } },
      sort:  [{ timestamp: 'desc' }],
    });

    return res.status(200).json({
      logs:       response.hits.hits.map(h => h._source),
      total:      response.hits.total.value,
      page:       parseInt(page),
      totalPages: Math.ceil(response.hits.total.value / parseInt(pageSize)),
    });
  } catch (err) {
    next(err);
  }
};

export { searchDocuments, getEntitySuggestions, getAuditLogs };