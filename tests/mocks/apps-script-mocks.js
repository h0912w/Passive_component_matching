/**
 * apps-script-mocks.js
 * Apps Script 전용 전역 객체(PropertiesService, CacheService, UrlFetchApp)를
 * Node.js 테스트 환경에서 사용할 수 있도록 mock으로 구현한 파일.
 *
 * 사용법:
 *   const { mockPropertiesService, mockCacheService, makeMockFetch } = require('./mocks/apps-script-mocks');
 */

'use strict';

// ─── PropertiesService mock ───────────────────────────────────────────────────
// Apps Script 에디터 > 프로젝트 설정 > 스크립트 속성을 테스트용 값으로 대체
const mockPropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => {
      const props = {
        MOUSER_API_KEY: 'test-mouser-key-000000000000000000000000',
        GLM_API_KEY:    'test-glm-key-000000000000000000000000'
      };
      return props[key] || null;
    },
    setProperty: (key, val) => {},
    deleteProperty: (key) => {}
  })
};

// ─── CacheService mock ────────────────────────────────────────────────────────
// 기본 동작: 항상 캐시 미스 → 실제 로직(fetch)이 실행되도록 함
const mockCacheService = {
  getScriptCache: () => {
    const store = {};
    return {
      get:    (key) => store[key] || null,
      put:    (key, val, ttl) => { store[key] = val; },
      remove: (key) => { delete store[key]; }
    };
  }
};

// ─── UrlFetchApp mock 팩토리 ──────────────────────────────────────────────────
// responseMap: URL 패턴(부분 일치) → { code: number, body: object }
// 예: { 'api.mouser.com': { code: 200, body: { SearchResults: ... } } }
function makeMockFetch(responseMap) {
  return {
    fetch: (url, options) => {
      const matchedKey = Object.keys(responseMap).find(k => url.includes(k));
      const resp = matchedKey
        ? responseMap[matchedKey]
        : { code: 404, body: { error: 'mock: no matching URL pattern' } };

      const bodyStr = typeof resp.body === 'string'
        ? resp.body
        : JSON.stringify(resp.body);

      return {
        getResponseCode:  () => resp.code,
        getContentText:   () => bodyStr,
        getHeaders:       () => ({ 'Content-Type': 'application/json' })
      };
    }
  };
}

// ─── 기본 Mouser 성공 응답 mock ───────────────────────────────────────────────
const mouserSuccessResponse = {
  SearchResults: {
    NumberOfResult: 1,
    Parts: [
      {
        ManufacturerPartNumber: 'RC0402JR-071KL',
        Manufacturer:            'Yageo',
        Description:             'Thick Film Resistors - SMD 1/16watt 1Kohms 5%',
        Availability:            'In Stock',
        AvailabilityInStock:     '5000000',
        PriceBreaks: [{ Quantity: 1, Price: '$0.10' }]
      }
    ]
  }
};

// ─── 기본 GLM 성공 응답 mock ─────────────────────────────────────────────────
const glmSuccessResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          resistance_ohms: 1000,
          package: '0402',
          tolerance_percent: 5
        })
      },
      finish_reason: 'stop'
    }
  ],
  usage: { total_tokens: 150 }
};

module.exports = {
  mockPropertiesService,
  mockCacheService,
  makeMockFetch,
  mouserSuccessResponse,
  glmSuccessResponse
};
