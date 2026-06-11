# 내용증명 작성 마법사

가입 없이, 무료로, 브라우저에서 질문 몇 개에 답하면 내용증명 PDF가 완성되는 도구입니다.
서버가 없는 100% 정적 사이트로, 입력 내용은 어디로도 전송되지 않습니다.

## 지원 사유

- 🏠 전세보증금 반환 청구
- 📦 중고거래 사기 대금 반환
- 💸 빌려준 돈(대여금) 반환
- 📄 계약 해지 통지
- 🔇 층간소음 자제 요청
- 💼 임금(급여) 체불 청구

## 구조

```
index.html        # 소개(랜딩) 페이지 — 비용 안내, 발송 가이드, FAQ
write.html        # 작성 마법사 (5단계)
assets/style.css  # 공통 스타일
assets/wizard.js  # 템플릿 정의 + 마법사 로직 + 문서 생성
```

빌드 도구나 의존성 없이 순수 HTML/CSS/JS로만 구성되어 있습니다.

## 로컬에서 실행

```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## GitHub Pages 배포

1. GitHub에 새 저장소를 만들고 이 디렉터리를 푸시합니다.
   ```bash
   git init
   git add .
   git commit -m "내용증명 작성 마법사"
   git remote add origin https://github.com/<아이디>/<저장소>.git
   git push -u origin main
   ```
2. 저장소 **Settings → Pages → Source**에서 `Deploy from a branch`, 브랜치 `main`, 폴더 `/ (root)` 선택 후 저장.
3. 1~2분 뒤 `https://<아이디>.github.io/<저장소>/`에서 접속됩니다.

## 면책

본 서비스가 제공하는 문서는 법률 자문이 아닌 참고용 양식입니다.
