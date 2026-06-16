import { client, DOCUMENTS_INDEX, ENTITIES_INDEX } from '../utils/elastic.js';
import prisma from '../db/prisma.js';

const getAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { dateFrom, dateTo } = req.query;

    const docFilters    = [{ term: { userId } }];
    const entityFilters = [{ term: { userId } }];

    if (dateFrom || dateTo) {
      const range = {};
      if (dateFrom) range.gte = dateFrom;
      if (dateTo)   range.lte = dateTo;
      docFilters.push({    range: { createdAt: range } });
      entityFilters.push({ range: { createdAt: range } });
    }

    const [docResponse, entityResponse] = await Promise.all([
      client.search({
        index: DOCUMENTS_INDEX,
        size:  0,
        query: { bool: { filter: docFilters } },
        aggs: {
          docs_over_time: {
            date_histogram: {
              field:             'createdAt',
              calendar_interval: 'day',
              format:            'yyyy-MM-dd',
            },
            aggs: {
              total_entities: { sum: { field: 'totalEntities' } },
            },
          },
          by_file_type: {
            terms: { field: 'fileType' },
            aggs: {
              avg_entities:    { avg: { field: 'totalEntities' } },
              avg_sensitivity: { avg: { field: 'sensitivityScore' } },
              avg_processing:  { avg: { field: 'processingTimeMs' } },
              max_processing: { max: { field: 'processingTimeMs' } },
              min_processing: { min: { field: 'processingTimeMs' } },
            },
          },
          by_redaction_method: {
            terms: { field: 'redactionMethod' },
          },
          processing_time_stats: {
            extended_stats: { field: 'processingTimeMs' },
          },
          sensitivity_distribution: {
            histogram: { field: 'sensitivityScore', interval: 10 },
          },
          sensitivity_ranges: {
            range: {
              field: 'sensitivityScore',
              ranges: [
                { key: 'low',    from: 0,  to: 30 },
                { key: 'medium', from: 30, to: 60 },
                { key: 'high',   from: 60, to: 100 },
              ],
            },
          },
          high_risk: {
            filter: { range: { sensitivityScore: { gte: 60 } } },
          },
          low_confidence: {
            filter: { range: { confidence: { lte: 60 } } },
          },
          avg_confidence_threshold: {
            avg: { field: 'confidenceThreshold' },
          },
        },
      }),

      client.search({
        index: ENTITIES_INDEX,
        size:  0,
        query: { bool: { filter: entityFilters } },
        aggs: {
          by_entity_type: {
            terms: { field: 'entityType', size: 17 },
            aggs: {
              avg_confidence: { avg: { field: 'confidence' } },
              docs_with_type: { cardinality: { field: 'documentId' } },
            },
          },
          confidence_distribution: {
            histogram: { field: 'confidence', interval: 0.1 },
          },
          low_confidence_entities: {
            filter: { range: { confidence: { lt: 0.99 } } },
            aggs: {
              by_type: { terms: { field: 'entityType', size: 17 } },
            },
          },
          top_entity_texts: {
            terms: { field: 'entityText.keyword', size: 10 },
          },
        },
      }),
    ]);

    const docAggs    = docResponse.aggregations;
    const entityAggs = entityResponse.aggregations;

    return res.status(200).json({
      docsOverTime: docAggs.docs_over_time.buckets.map(b => ({
        date:          b.key_as_string,
        documents:     b.doc_count,
        totalEntities: b.total_entities.value,
      })),

      entityDistribution: entityAggs.by_entity_type.buckets.map(b => ({
        entityType:       b.key,
        count:            b.doc_count,
        avgConfidence:    Math.round((b.avg_confidence.value || 0) * 100),
        uniqueDocuments:  b.docs_with_type.value,
      })),

      byFileType: docAggs.by_file_type.buckets.map(b => ({
        fileType:       b.key,
        count:          b.doc_count,
        avgEntities:    Math.round(b.avg_entities.value    || 0),
        avgSensitivity: Math.round(b.avg_sensitivity.value || 0),
        avgProcessingMs: Math.round(b.avg_processing.value || 0),
        maxProcessingMs: Math.round(b.max_processing.value || 0),
        minProcessingMs: Math.round(b.min_processing.value || 0),
      })),

      byRedactionMethod: docAggs.by_redaction_method.buckets.map(b => ({
        method: b.key,
        count:  b.doc_count,
      })),

      processingTimeStats: {
        avg:    Math.round(docAggs.processing_time_stats.avg    || 0),
        min:    Math.round(docAggs.processing_time_stats.min    || 0),
        max:    Math.round(docAggs.processing_time_stats.max    || 0),
        stdDev: Math.round(docAggs.processing_time_stats.std_deviation || 0),
      },

      size_vs_time: {
        terms: { field: 'documentId', size: 100 },
        aggs: {
          file_size: { avg: { field: 'fileSizeBytes' } },
          proc_time: { avg: { field: 'processingTimeMs' } },
        },
      },

      sensitivityDistribution: docAggs.sensitivity_distribution.buckets.map(b => ({
        range: `${b.key}-${b.key + 10}`,
        count: b.doc_count,
      })),

      confidenceDistribution: entityAggs.confidence_distribution.buckets.map(b => ({
        range: `${Math.round(b.key * 100)}%`,
        count: b.doc_count,
      })),

      lowConfidenceByType: entityAggs.low_confidence_entities.by_type.buckets.map(b => ({
        entityType: b.key,
        count:      b.doc_count,
      })),

      topEntityTexts: entityAggs.top_entity_texts.buckets.map(b => ({
        text:  b.key,
        count: b.doc_count,
      })),

      summary: {
        totalDocuments:         docResponse.hits.total?.value ?? 0,
        totalEntityOccurrences: entityResponse.hits.total?.value ?? 0,
        highRiskDocuments:      docAggs.high_risk.doc_count,
        lowConfidenceDocuments: docAggs.low_confidence.doc_count,
        avgConfidenceThreshold: Math.round(docAggs.avg_confidence_threshold.value || 0),
        sensitivityBreakdown: {
          low:    docAggs.sensitivity_ranges.buckets.find(b => b.key === 'low')?.doc_count    || 0,
          medium: docAggs.sensitivity_ranges.buckets.find(b => b.key === 'medium')?.doc_count || 0,
          high:   docAggs.sensitivity_ranges.buckets.find(b => b.key === 'high')?.doc_count   || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSizeVsTime = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const documents = await prisma.document.findMany({
      where: { userId, status: 'complete' },
      select: {
        filename:         true,
        fileSizeBytes:    true,
        processingTimeMs: true,
        fileType:         true,
      },
      take: 200,
    });

    const data = documents
      .filter(d => d.fileSizeBytes && d.processingTimeMs)
      .map(d => ({
        filename:  d.filename,
        sizeMB:    parseFloat((d.fileSizeBytes / (1024 * 1024)).toFixed(2)),
        timeS:     parseFloat((d.processingTimeMs / 1000).toFixed(2)),
        fileType:  d.fileType,
      }));

    return res.status(200).json({ data });
  } catch (err) {
    next(err);
  }
};

const getUploadHeatmap = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const documents = await prisma.document.findMany({
      where: { userId },
      select: { createdAt: true },
    });

    const heatmap = {};
    const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

    HOURS.forEach(h => {
      heatmap[h] = {};
      DAYS.forEach(d => { heatmap[h][d] = 0; });
    });

    for (const doc of documents) {
      const date    = new Date(doc.createdAt);
      const day     = DAYS[date.getDay()];
      const rawHour = date.getHours();
      const bucket  = HOURS.reduce((prev, curr) =>
        Math.abs(curr - rawHour) < Math.abs(prev - rawHour) ? curr : prev
      );
      heatmap[bucket][day]++;
    }

    const rows = HOURS.map(h => ({
      hour: `${String(h).padStart(2, '0')}:00`,
      ...DAYS.reduce((acc, d) => ({ ...acc, [d]: heatmap[h][d] }), {}),
    }));

    return res.status(200).json({ rows, days: DAYS, hours: HOURS.map(h => `${String(h).padStart(2, '0')}:00`) });
  } catch (err) {
    next(err);
  }
};

export { getAnalytics, getSizeVsTime, getUploadHeatmap };
