const API = 'http://localhost:5000/api';

const authFetch = async (url, opts = {}) => {
  let token = localStorage.getItem('accessToken');

  let res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      localStorage.clear();
      window.location.href = '/login';
      return null;
    }

    const refreshRes = await fetch(`${API}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      localStorage.clear();
      window.location.href = '/login';
      return null;
    }

    const data = await refreshRes.json();

    localStorage.setItem('accessToken', data.accessToken);

    res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${data.accessToken}`,
        ...(opts.headers || {}),
      },
    });
  }

  return res;
};

export default authFetch;