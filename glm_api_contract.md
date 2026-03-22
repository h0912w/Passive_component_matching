# GLM API 계약 문서
**경로**: `/docs/glm_api_contract.md`
**역할**: GLM API 입출력 스키마, 프롬프트 패턴, 시행착오를 누적하는 성장형 문서.
코드 실행 중 새로 알게 된 사실, 오류 패턴, 개선된 프롬프트는 이 문서에 기록한다.

---

## §1. 기본 연결 정보

```
모델명:      glm-4.7   (⚠️ z.ai 대시보드에서 실제 model string 확인 필요)
엔드포인트:  https://api.z.ai/api/paas/v4/chat/completions
인증:        Bearer {GLM_API_KEY}  — Worker Secret에서만 읽기
temperature: 0  (결정론적 응답 우선)
max_tokens:  512  (스펙 추출에는 짧은 응답으로 충분)
재시도:      최대 2회, 이후 코드 결과 우선
```

> ⚠️ 코딩 플랜 전용 엔드포인트(`https://api.z.ai/api/coding/paas/v4`)는
> Claude Code 개발 도구용이며 **런타임 웹서비스에서 사용 금지**

---

## §2. 요청 구조

```json
{
  "model": "glm-4.7",
  "temperature": 0,
  "max_tokens": 512,
  "messages": [
    {
      "role": "system",
      "content": "<§3 시스템 프롬프트 참조>"
    },
    {
      "role": "user",
      "content": "<§4 사용자 프롬프트 템플릿 참조>"
    }
  ]
}
```

---

## §3. 시스템 프롬프트

```
You are a resistor specification parser assistant.
Your job is to extract structured resistor specifications from free-form text.
Always respond with valid JSON only. No explanation, no markdown, no preamble.
If a field cannot be determined, set it to null.
```

---

## §4. 사용자 프롬프트 템플릿

### 4.1 보조 추출 (파서 partial 결과 있을 때)
```
Parse the following resistor specification string and extract missing fields.

Input string: "{raw_input}"

Parser already extracted (treat as confirmed, do not change):
{json_stringify(rule_parse_confirmed_fields)}

Extract only the missing fields: {missing_fields_list}

Respond with JSON only:
{
  "resistance": {"value_ohm": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "package": {"normalized": "<string|null>", "text": "<string|null>", "confidence": <0.0-1.0>},
  "tolerance": {"percent": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "power": {"watt": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "warnings": ["<string>"]
}
```

### 4.2 더블체크 (파서 결과 재검토 요청)
```
Verify the following resistor spec extraction result.

Input string: "{raw_input}"
Parser result: {json_stringify(rule_parse_result)}

Check if the parser result is correct. Flag any issues.

Respond with JSON only:
{
  "verified": <true|false>,
  "issues": [{"field": "<string>", "problem": "<string>", "suggested": <value|null>}],
  "warnings": ["<string>"]
}
```

---

## §5. 응답 스키마

```json
{
  "rule_parse": {
    "resistance": {"value_ohm": 4700, "text": "4R7", "confidence": 0.98},
    "package":    {"normalized": "1608M/0603I", "text": "1608", "confidence": 0.95},
    "tolerance":  {"percent": 5, "text": "5%", "confidence": 0.99},
    "power":      {"watt": 0.25, "text": "0.25W", "confidence": 0.99}
  },
  "glm_check": {
    "used": true,
    "reason": "resistance_not_found",
    "resistance": {"value_ohm": 4700, "text": "4R7", "confidence": 0.91},
    "package": null,
    "tolerance": null,
    "power": null,
    "warnings": []
  },
  "final": {
    "resistance": {"value_ohm": 4700, "text": "4R7"},
    "package":    {"normalized": "1608M/0603I", "text": "1608"},
    "tolerance":  {"percent": 5, "text": "5%"},
    "power":      {"watt": 0.25, "text": "0.25W"}
  }
}
```

---

## §6. 에러 처리 패턴

| HTTP 코드 | 의미 | 처리 방법 |
|---|---|---|
| 200 | 정상 | 응답 파싱 → 스키마 검증 |
| 400 | 요청 형식 오류 | 프롬프트 확인 후 재시도 1회 |
| 429 | Rate Limit | 1초 대기 후 재시도 |
| 500 | 서버 오류 | 즉시 재시도 1회, 이후 코드 결과 우선 |
| JSON 파싱 실패 | 응답이 JSON이 아님 | 재시도 1회, 이후 코드 결과 우선 |

---

## §7. 알려진 응답 패턴 및 시행착오

> 실제 운영 중 발견한 GLM 응답 특성을 여기에 기록한다.
> 이 섹션이 쌓일수록 파서와 프롬프트가 개선된다.

| # | 발견일 | 상황 | GLM 응답 특성 | 대응 방법 |
|---|---|---|---|---|
| 001 | (초기) | - | - | - |

---

## §8. 프롬프트 개선 이력

> 프롬프트를 변경할 때마다 이전 버전과 변경 이유를 기록한다.

| 버전 | 변경일 | 변경 내용 | 변경 이유 |
|---|---|---|---|
| v1.0 | 초기 | 기본 추출 프롬프트 작성 | - |

---

## §9. 호출 로깅 형식

> Worker가 GLM API를 호출할 때마다 아래 형식으로 로그를 남긴다.

```json
{
  "timestamp": "2026-01-01T00:00:00Z",
  "input": "4R7 1608",
  "reason": "resistance_not_found",
  "used": true,
  "response_confidence": 0.91,
  "retry_count": 0,
  "success": true
}
```

---

*최초 작성: 설계 지침서 v3 기반 | 운영 중 발견되는 새 지식 반영하여 성장*
