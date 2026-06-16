import { createContext, useContext, useState, useCallback } from 'react';

const RedactContext = createContext(null);

export const RedactProvider = ({ children }) => {
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const clearResult = useCallback(() => setResult(null), []);

  const processDocument = useCallback(async ({ uploadMethod, selectedFile, textInput, redactionMethod, confidenceThreshold, entityTypes, ENTITY_LIST }) => {
    if (!uploadMethod) return;

    const token = localStorage.getItem('accessToken');
    setIsProcessing(true);

    try {
      const selectedKeys = Object.entries(entityTypes)
        .filter(([, v]) => v)
        .map(([k]) => k);

      let body;
      let headers = { Authorization: `Bearer ${token}` };

      if (uploadMethod === 'text') {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify({
          text: textInput,
          method: redactionMethod,
          confidence: confidenceThreshold,
          entities: selectedKeys.length === ENTITY_LIST.length ? 'ALL' : selectedKeys,
        });
      } else {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('method', redactionMethod);
        formData.append('confidence', confidenceThreshold);
        formData.append('entities', selectedKeys.length === ENTITY_LIST.length ? 'ALL' : selectedKeys.join(','));
        body = formData;
        delete headers['Content-Type'];
      }

      const response = await fetch('http://localhost:5000/api/redact', {
        method: 'POST',
        headers,
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.error || `Server error: ${response.status}` });
        return;
      }

      setResult(data);
    } catch (err) {
      setResult({ error: err.message || 'Something went wrong' });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return (
    <RedactContext.Provider value={{ result, isProcessing, clearResult, processDocument }}>
      {children}
    </RedactContext.Provider>
  );
};

export const useRedact = () => useContext(RedactContext);
