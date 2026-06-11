/* ============================================
   내용증명 작성 마법사 — 전 과정이 브라우저에서만 동작 (서버 전송 없음)
   ============================================ */
(function () {
  "use strict";

  /* ---------- 유틸 ---------- */

  // 1234567 → "1,234,567"
  function comma(n) {
    return Number(n).toLocaleString("ko-KR");
  }

  // 숫자 → 한글 금액 (위변조 방지를 위해 '일'을 생략하지 않는 관행을 따름)
  function moneyToKorean(num) {
    num = Math.floor(Number(num));
    if (!num || num <= 0) return "";
    var digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
    var small = ["", "십", "백", "천"];
    var big = ["", "만", "억", "조", "경"];
    var str = String(num);
    var groups = [];
    while (str.length > 0) {
      groups.unshift(str.slice(-4));
      str = str.slice(0, -4);
    }
    var result = "";
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      var part = "";
      for (var j = 0; j < g.length; j++) {
        var d = Number(g[j]);
        if (d === 0) continue;
        part += digits[d] + small[g.length - 1 - j];
      }
      if (part !== "") result += part + big[groups.length - 1 - i];
    }
    return result;
  }

  // "2026-06-11" → "2026년 6월 11일"
  function fmtDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return p[0] + "년 " + Number(p[1]) + "월 " + Number(p[2]) + "일";
  }

  // 금액을 "금 일천만 원(₩10,000,000)" 형식으로
  function fmtMoney(num) {
    if (!num) return "";
    return "금 " + moneyToKorean(num) + " 원(₩" + comma(num) + ")";
  }

  function todayKorean() {
    var d = new Date();
    return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- 사유별 템플릿 정의 ---------- */
  // 각 템플릿: label(이름), emoji, sub(설명), subject(제목), fields(세부 입력), build(본문 생성)
  var TEMPLATES = {
    jeonse: {
      label: "전세보증금 반환",
      emoji: "🏠",
      sub: "보증금을 돌려주지 않을 때",
      subject: "임대차보증금 반환 청구의 건",
      fields: [
        { key: "propertyAddr", label: "임차 주택 주소", type: "text", required: true, placeholder: "서울특별시 ○○구 ○○로 12, 101동 1001호", full: true },
        { key: "contractDate", label: "임대차계약 체결일", type: "date", required: true },
        { key: "endDate", label: "임대차계약 만료일", type: "date", required: true },
        { key: "deposit", label: "임대차보증금", type: "money", required: true, placeholder: "300000000" },
        { key: "deadline", label: "반환 요청 기한", type: "date", required: true },
        { key: "refundAccount", label: "반환받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true },
        { key: "extra", label: "추가로 적을 내용", type: "textarea", required: false, placeholder: "갱신 거절 통지를 한 날짜, 집주인과의 연락 시도 내역 등이 있으면 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 무궁한 발전을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.contractDate) + " 수신인과 사이에 「" + d.propertyAddr + "」 소재 주택에 관하여 임대차보증금 " + fmtMoney(d.deposit) + ", 임대차기간 만료일 " + fmtDate(d.endDate) + "로 하는 임대차계약을 체결하고, 위 보증금을 전액 지급한 후 현재까지 위 주택에 거주하고 있는 임차인입니다.");
        ps.push("3. 위 임대차계약은 " + fmtDate(d.endDate) + "자로 기간 만료로 종료되었거나 종료될 예정이며, 발신인은 수신인에게 계약을 갱신할 의사가 없음을 분명히 밝힌 바 있습니다. 따라서 수신인은 임대차계약 종료와 동시에 발신인에게 위 임대차보증금 전액을 반환할 의무가 있습니다.");
        var demand = "4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 임대차보증금 " + fmtMoney(d.deposit) + "을 반환하여 줄 것을 정식으로 청구합니다.";
        if (d.refundAccount) demand += " 보증금은 아래 계좌로 입금하여 주시기 바랍니다.\n※ 반환 계좌: " + d.refundAccount;
        ps.push(demand);
        if (d.extra) ps.push("5. " + d.extra);
        ps.push((d.extra ? "6" : "5") + ". 만일 위 기한까지 보증금이 반환되지 아니할 경우, 발신인은 부득이 임차권등기명령 신청, 임대차보증금 반환청구 소송 제기 및 이에 따른 지연손해금(소송촉진 등에 관한 특례법 소정의 연 12%)과 소송비용 일체의 청구 등 법적 절차를 진행할 예정임을 알려드리니, 부디 원만히 해결되기를 바랍니다.");
        return ps;
      }
    },

    fraud: {
      label: "중고거래 사기 대금 반환",
      emoji: "📦",
      sub: "돈만 받고 물건을 보내지 않을 때",
      subject: "물품대금 반환 청구의 건",
      fields: [
        { key: "dealDate", label: "거래(송금)일", type: "date", required: true },
        { key: "platform", label: "거래 플랫폼", type: "select", required: true, options: ["당근마켓", "중고나라", "번개장터", "기타(직거래 등)"] },
        { key: "item", label: "구매 물품명", type: "text", required: true, placeholder: "아이폰 15 Pro 256GB", full: true },
        { key: "amount", label: "송금 금액", type: "money", required: true, placeholder: "800000" },
        { key: "deadline", label: "반환 요청 기한", type: "date", required: true },
        { key: "account", label: "송금한 상대방 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 김○○)", full: true },
        { key: "extra", label: "사건 경위 보충", type: "textarea", required: false, placeholder: "연락 두절 시점, 차단 여부, 대화 내용 요지 등을 적으면 더 구체적인 문서가 됩니다.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 안녕을 기원합니다.");
        var p2 = "2. 발신인은 " + fmtDate(d.dealDate) + " " + d.platform + "을(를) 통하여 수신인으로부터 「" + d.item + "」을(를) 구매하기로 하고, 같은 날 수신인이 지정한 계좌로 물품대금 " + fmtMoney(d.amount) + "을 송금하였습니다.";
        if (d.account) p2 += "\n※ 송금 계좌: " + d.account;
        ps.push(p2);
        ps.push("3. 그러나 수신인은 대금을 수령하고도 현재까지 물품을 인도하지 아니하였으며, 발신인의 거듭된 연락에도 응하지 않고 있습니다." + (d.extra ? " " + d.extra : ""));
        ps.push("4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 물품대금 " + fmtMoney(d.amount) + " 전액을 반환하거나, 약정한 물품을 즉시 인도하여 줄 것을 최고합니다.");
        ps.push("5. 만일 위 기한까지 아무런 조치가 없을 경우, 발신인은 수신인을 사기죄(형법 제347조)로 형사 고소하는 한편, 민사상 부당이득반환 청구 소송 및 지급명령 신청 등 가능한 모든 법적 조치를 취할 예정임을 엄중히 통지합니다.");
        return ps;
      }
    },

    loan: {
      label: "빌려준 돈(대여금) 반환",
      emoji: "💸",
      sub: "빌려준 돈을 갚지 않을 때",
      subject: "대여금 변제 최고의 건",
      fields: [
        { key: "loanDate", label: "돈을 빌려준 날", type: "date", required: true },
        { key: "amount", label: "대여 금액", type: "money", required: true, placeholder: "5000000" },
        { key: "dueDate", label: "갚기로 한 날", type: "date", required: false, hint: "약정이 없었다면 비워 두세요." },
        { key: "deadline", label: "변제 요청 기한", type: "date", required: true },
        { key: "account", label: "변제받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true },
        { key: "extra", label: "추가로 적을 내용", type: "textarea", required: false, placeholder: "이자 약정, 일부 변제받은 내역, 차용증 유무 등을 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 건승을 기원합니다.");
        var p2 = "2. 발신인은 " + fmtDate(d.loanDate) + " 수신인에게 " + fmtMoney(d.amount) + "을 대여하였습니다.";
        if (d.dueDate) p2 += " 당시 수신인은 위 금원을 " + fmtDate(d.dueDate) + "까지 변제하기로 약정하였습니다.";
        ps.push(p2);
        ps.push("3. 그러나 수신인은 " + (d.dueDate ? "위 변제기일이 지난 현재까지" : "발신인의 거듭된 변제 요청에도 불구하고 현재까지") + " 위 대여금을 변제하지 아니하고 있습니다." + (d.extra ? " " + d.extra : ""));
        var p4 = "4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 대여금 " + fmtMoney(d.amount) + " 및 이에 대한 이자를 변제하여 줄 것을 최고합니다.";
        if (d.account) p4 += "\n※ 변제 계좌: " + d.account;
        ps.push(p4);
        ps.push("5. 만일 위 기한까지 변제가 이루어지지 아니할 경우, 발신인은 지급명령 신청 또는 대여금 반환청구 소송을 제기할 것이며, 이 경우 지연손해금 및 소송비용 일체를 함께 청구할 예정임을 알려드립니다.");
        return ps;
      }
    },

    terminate: {
      label: "계약 해지 통지",
      emoji: "📄",
      sub: "계약을 해지하고 정산을 요구할 때",
      subject: "계약 해지 통지의 건",
      fields: [
        { key: "contractName", label: "계약명", type: "text", required: true, placeholder: "인테리어 공사 도급계약, 헬스장 이용계약 등", full: true },
        { key: "contractDate", label: "계약 체결일", type: "date", required: true },
        { key: "paidAmount", label: "이미 지급한 금액", type: "money", required: false },
        { key: "reason", label: "해지 사유", type: "textarea", required: true, placeholder: "예) 약정한 착공일이 한 달 이상 지나도록 공사가 시작되지 않았고, 수차례 연락에도 일정 회신이 없었습니다.", full: true },
        { key: "deadline", label: "정산(환불) 요청 기한", type: "date", required: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀사의(귀하의) 무궁한 발전을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.contractDate) + " 수신인과 사이에 「" + d.contractName + "」(이하 '본 계약')을 체결하였습니다" + (d.paidAmount ? " 그리고 본 계약에 따라 " + fmtMoney(d.paidAmount) + "을 지급하였습니다." : "."));
        ps.push("3. 그러나 다음과 같은 사유가 발생하였습니다.\n" + d.reason);
        ps.push("4. 위와 같은 사유로 본 계약의 목적을 더 이상 달성할 수 없게 되었으므로, 발신인은 본 통지서로써 본 계약을 해지함을 통지합니다. 본 계약은 이 통지서가 수신인에게 도달한 날에 해지의 효력이 발생합니다.");
        ps.push("5. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 " + (d.paidAmount ? "기지급한 " + fmtMoney(d.paidAmount) + "의 반환 등 " : "") + "계약 해지에 따른 정산 및 원상회복을 이행하여 줄 것을 요구합니다.");
        ps.push("6. 만일 위 기한까지 정산이 이루어지지 아니할 경우, 발신인은 민사소송 제기 등 법적 절차를 통하여 권리를 행사할 예정이며, 이로 인하여 발생하는 모든 비용은 수신인이 부담하게 될 것임을 알려드립니다.");
        return ps;
      }
    },

    noise: {
      label: "층간소음 자제 요청",
      emoji: "🔇",
      sub: "반복되는 소음 피해를 알릴 때",
      subject: "층간소음 피해에 따른 자제 요청의 건",
      fields: [
        { key: "myUnit", label: "발신인 거주 호수", type: "text", required: true, placeholder: "101동 901호" },
        { key: "since", label: "소음이 시작된 시기", type: "date", required: true },
        { key: "timeRange", label: "주로 발생하는 시간대", type: "text", required: true, placeholder: "밤 10시 ~ 새벽 1시" },
        { key: "noiseType", label: "소음 유형", type: "text", required: true, placeholder: "아이들이 뛰는 소리, 가구 끄는 소리 등" },
        { key: "extra", label: "피해 내용 보충", type: "textarea", required: false, placeholder: "수면 방해, 관리사무소 중재 요청 내역 등 구체적인 피해 사실을 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 안녕하십니까. 발신인은 귀하와 같은 공동주택 " + d.myUnit + "에 거주하는 입주민입니다.");
        ps.push("2. " + fmtDate(d.since) + " 무렵부터 현재까지 귀하의 세대에서 발생하는 소음(" + d.noiseType + ")으로 인하여 발신인 가족은 일상생활에 심각한 고통을 겪고 있습니다. 특히 " + d.timeRange + " 사이에 소음이 집중되어 정상적인 휴식과 수면이 어려운 상황입니다." + (d.extra ? " " + d.extra : ""));
        ps.push("3. 공동주택의 입주자는 공동주택관리법 제20조에 따라 층간소음으로 다른 입주자에게 피해를 주지 아니하도록 노력할 의무가 있습니다. 이에 발신인은 귀하께 위 시간대의 소음 발생을 자제하여 주실 것을 정중히 요청드립니다.");
        ps.push("4. 본 통지에도 불구하고 소음이 개선되지 아니할 경우, 발신인은 부득이 관리주체를 통한 조치 요청, 공동주택관리 분쟁조정위원회 및 환경분쟁조정위원회에 대한 조정 신청, 나아가 민사상 손해배상 청구 등의 절차를 검토할 수밖에 없음을 알려드립니다.");
        ps.push("5. 같은 건물에서 생활하는 이웃으로서 원만하게 해결되기를 진심으로 바랍니다.");
        return ps;
      }
    },

    wage: {
      label: "임금(급여) 체불 청구",
      emoji: "💼",
      sub: "급여·퇴직금을 받지 못했을 때",
      subject: "체불임금 지급 청구의 건",
      fields: [
        { key: "company", label: "회사(사업장)명", type: "text", required: true, placeholder: "주식회사 ○○", full: true },
        { key: "workStart", label: "근무 시작일", type: "date", required: true },
        { key: "workEnd", label: "근무 종료일(퇴사일)", type: "date", required: false, hint: "재직 중이면 비워 두세요." },
        { key: "amount", label: "체불 금액 합계", type: "money", required: true, placeholder: "4500000" },
        { key: "detail", label: "체불 내역", type: "textarea", required: true, placeholder: "예) 2026년 3월분 급여 250만 원, 4월분 급여 200만 원", full: true },
        { key: "deadline", label: "지급 요청 기한", type: "date", required: true },
        { key: "account", label: "지급받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀사의 무궁한 발전을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.workStart) + "부터 " + (d.workEnd ? fmtDate(d.workEnd) + "까지" : "현재까지") + " 수신인이 운영하는 「" + d.company + "」에서 근무" + (d.workEnd ? "한 근로자입니다." : "하고 있는 근로자입니다."));
        ps.push("3. 그러나 수신인은 발신인에게 아래와 같이 합계 " + fmtMoney(d.amount) + "의 임금을 지급하지 아니하고 있습니다.\n※ 체불 내역: " + d.detail);
        ps.push("4. 근로기준법 제36조에 따라 사용자는 근로자가 퇴직한 경우 그 지급 사유가 발생한 때부터 14일 이내에 임금, 보상금, 그 밖의 모든 금품을 지급하여야 하며, 이를 위반할 경우 같은 법 제109조에 따라 형사처벌의 대상이 됩니다.");
        var p5 = "5. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 체불임금 " + fmtMoney(d.amount) + " 전액을 지급하여 줄 것을 청구합니다.";
        if (d.account) p5 += "\n※ 지급 계좌: " + d.account;
        ps.push(p5);
        ps.push("6. 만일 위 기한까지 지급되지 아니할 경우, 발신인은 관할 고용노동지청에 진정 및 고소를 제기하고, 민사상 임금 청구 소송(퇴직일로부터 14일 경과 시 근로기준법 제37조 소정의 연 20% 지연이자 포함)을 진행할 예정임을 알려드립니다.");
        return ps;
      }
    },

    renewal: {
      label: "계약갱신요구권 행사",
      emoji: "🔄",
      sub: "전월세 계약을 연장하고 싶을 때",
      subject: "임대차계약 갱신요구권 행사 통지의 건",
      fields: [
        { key: "propertyAddr", label: "임차 주택 주소", type: "text", required: true, placeholder: "서울특별시 ○○구 ○○로 12, 101동 1001호", full: true },
        { key: "contractDate", label: "임대차계약 체결일", type: "date", required: true },
        { key: "endDate", label: "임대차계약 만료일", type: "date", required: true },
        { key: "deposit", label: "현재 보증금", type: "money", required: false },
        { key: "monthlyRent", label: "현재 월 차임(월세)", type: "money", required: false, hint: "전세라면 비워 두세요." },
        { key: "extra", label: "추가로 적을 내용", type: "textarea", required: false, placeholder: "이전에 구두나 문자로 갱신 의사를 전달한 내역이 있으면 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        var terms = [];
        if (d.deposit) terms.push("보증금 " + fmtMoney(d.deposit));
        if (d.monthlyRent) terms.push("월 차임 " + fmtMoney(d.monthlyRent));
        ps.push("1. 귀하의 평안을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.contractDate) + " 수신인과 사이에 「" + d.propertyAddr + "」 소재 주택에 관하여 " + (terms.length ? terms.join(", ") + ", " : "") + "임대차기간 만료일 " + fmtDate(d.endDate) + "로 하는 임대차계약을 체결하고 현재까지 거주하고 있는 임차인입니다.");
        ps.push("3. 발신인은 본 통지서로써 주택임대차보호법 제6조의3에 따른 계약갱신요구권을 행사하여, 위 임대차계약을 종전과 동일한 조건으로 갱신할 것을 요구합니다. 본 통지는 임대차기간 만료 6개월 전부터 2개월 전까지 사이에 이루어지는 적법한 갱신요구입니다." + (d.extra ? " " + d.extra : ""));
        ps.push("4. 주택임대차보호법 제6조의3 제1항에 따라 임대인은 같은 항 각 호의 정당한 사유(임대인 본인의 실거주 등)가 없는 한 임차인의 갱신요구를 거절할 수 없으며, 갱신되는 임대차의 차임과 보증금 증액은 같은 법 제7조에 따라 약정 차임 등의 20분의 1(5%)을 초과할 수 없습니다.");
        ps.push("5. 본 통지서는 갱신요구권 행사 사실과 그 시점을 증명하기 위한 것이니, 갱신 조건에 관하여 협의할 사항이 있으시면 발신인에게 연락하여 주시기 바랍니다.");
        return ps;
      }
    },

    rent: {
      label: "월세 미납 독촉 (임대인용)",
      emoji: "🧾",
      sub: "임차인이 월세를 연체할 때",
      subject: "연체 차임 지급 청구 및 계약 해지 예고의 건",
      fields: [
        { key: "propertyAddr", label: "임대 주택(상가) 주소", type: "text", required: true, placeholder: "서울특별시 ○○구 ○○로 12, 101동 1001호", full: true },
        { key: "contractDate", label: "임대차계약 체결일", type: "date", required: true },
        { key: "monthlyRent", label: "월 차임(월세)", type: "money", required: true, placeholder: "800000" },
        { key: "overdueDetail", label: "연체 내역", type: "textarea", required: true, placeholder: "예) 2026년 4월분, 5월분 차임 합계 2개월분 연체", full: true },
        { key: "overdueAmount", label: "연체 차임 합계", type: "money", required: true },
        { key: "deadline", label: "지급 요청 기한", type: "date", required: true },
        { key: "account", label: "지급받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 평안을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.contractDate) + " 수신인과 사이에 「" + d.propertyAddr + "」에 관하여 월 차임 " + fmtMoney(d.monthlyRent) + "으로 하는 임대차계약을 체결한 임대인입니다.");
        ps.push("3. 그러나 수신인은 아래와 같이 차임 합계 " + fmtMoney(d.overdueAmount) + "을 연체하고 있습니다.\n※ 연체 내역: " + d.overdueDetail);
        var p4 = "4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 연체 차임 전액을 지급하여 줄 것을 최고합니다.";
        if (d.account) p4 += "\n※ 지급 계좌: " + d.account;
        ps.push(p4);
        ps.push("5. 민법 제640조에 따라 임차인의 차임 연체액이 2기의 차임액에 달하는 때에는 임대인은 임대차계약을 해지할 수 있습니다. 위 기한까지 연체 차임이 지급되지 아니할 경우 발신인은 별도의 통지로 임대차계약을 해지하고, 건물 명도 청구 및 연체 차임·손해배상 청구 등 법적 절차를 진행할 예정임을 알려드립니다.");
        return ps;
      }
    },

    invoice: {
      label: "용역대금(외주비) 청구",
      emoji: "🖥️",
      sub: "작업을 끝냈는데 대금을 못 받을 때",
      subject: "용역대금 지급 청구의 건",
      fields: [
        { key: "workName", label: "용역(작업) 내용", type: "text", required: true, placeholder: "홈페이지 디자인 및 개발, 영상 편집 등", full: true },
        { key: "contractDate", label: "계약(의뢰)일", type: "date", required: true },
        { key: "doneDate", label: "용역 완료(납품)일", type: "date", required: true },
        { key: "amount", label: "미지급 대금", type: "money", required: true },
        { key: "deadline", label: "지급 요청 기한", type: "date", required: true },
        { key: "account", label: "지급받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true },
        { key: "extra", label: "추가로 적을 내용", type: "textarea", required: false, placeholder: "계약금 수령 여부, 지급 약속을 미룬 경위 등을 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀사의(귀하의) 무궁한 발전을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.contractDate) + " 수신인으로부터 「" + d.workName + "」 용역을 의뢰받아 " + fmtDate(d.doneDate) + " 이를 완료하여 납품하였습니다.");
        ps.push("3. 그러나 수신인은 용역이 완료되었음에도 현재까지 그 대금 " + fmtMoney(d.amount) + "을 지급하지 아니하고 있습니다." + (d.extra ? " " + d.extra : ""));
        var p4 = "4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 용역대금 " + fmtMoney(d.amount) + " 전액을 지급하여 줄 것을 청구합니다.";
        if (d.account) p4 += "\n※ 지급 계좌: " + d.account;
        ps.push(p4);
        ps.push("5. 만일 위 기한까지 지급되지 아니할 경우, 발신인은 지급명령 신청 또는 용역대금 청구 소송을 제기할 것이며, 이 경우 상법 소정의 지연이자 및 소송비용 일체를 함께 청구할 예정임을 알려드립니다.");
        return ps;
      }
    },

    refund: {
      label: "환불 청구",
      emoji: "💳",
      sub: "학원·헬스장 등 환불을 거부당할 때",
      subject: "계약 해지에 따른 환불 청구의 건",
      fields: [
        { key: "serviceName", label: "서비스(상품)명", type: "text", required: true, placeholder: "○○헬스장 12개월 회원권, ○○학원 3개월 수강권 등", full: true },
        { key: "payDate", label: "결제일", type: "date", required: true },
        { key: "paidAmount", label: "결제 금액", type: "money", required: true },
        { key: "reason", label: "해지·환불 사유", type: "textarea", required: true, placeholder: "예) 이사로 인해 더 이상 이용이 불가능하여 5월 1일 해지를 요청했으나 환불을 거부당했습니다.", full: true },
        { key: "refundAmount", label: "요구 환불액", type: "money", required: false, hint: "이용 일수 공제 후 금액을 알면 적어 주세요." },
        { key: "deadline", label: "환불 요청 기한", type: "date", required: true },
        { key: "account", label: "환불받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀사의 무궁한 발전을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.payDate) + " 수신인에게 「" + d.serviceName + "」 대금으로 " + fmtMoney(d.paidAmount) + "을 결제한 소비자입니다.");
        ps.push("3. 발신인은 다음과 같은 사유로 위 계약의 해지와 환불을 요청하였으나 정당한 처리가 이루어지지 않고 있습니다.\n" + d.reason);
        ps.push("4. 방문판매 등에 관한 법률, 할부거래에 관한 법률 및 공정거래위원회 고시 「소비자분쟁해결기준」에 따라 소비자는 계속거래 계약을 중도에 해지할 수 있고, 사업자는 이용 일수에 해당하는 금액과 법정 위약금을 공제한 잔액을 환급할 의무가 있습니다.");
        var p5 = "5. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 " + (d.refundAmount ? "환불금 " + fmtMoney(d.refundAmount) : "관련 기준에 따라 정산한 환불금") + "을 지급하여 줄 것을 청구합니다.";
        if (d.account) p5 += "\n※ 환불 계좌: " + d.account;
        ps.push(p5);
        ps.push("6. 만일 위 기한까지 환불이 이루어지지 아니할 경우, 발신인은 한국소비자원 피해구제 신청, 관할 지방자치단체 신고 및 민사소송 제기 등 가능한 모든 조치를 취할 예정임을 알려드립니다.");
        return ps;
      }
    },

    defame: {
      label: "명예훼손 게시물 삭제 요청",
      emoji: "🚫",
      sub: "허위 게시글·악성 후기에 대응할 때",
      subject: "명예훼손 게시물 삭제 및 게시 중단 요청의 건",
      fields: [
        { key: "postLocation", label: "게시물 위치(URL 등)", type: "text", required: true, placeholder: "https://cafe.naver.com/... 또는 ○○ 카페 자유게시판", full: true },
        { key: "postDate", label: "게시일", type: "date", required: true },
        { key: "postContent", label: "게시물 내용 요지", type: "textarea", required: true, placeholder: "예) 발신인이 운영하는 가게에 대하여 사실과 다른 위생 문제를 단정적으로 적시한 글", full: true },
        { key: "deadline", label: "삭제 요청 기한", type: "date", required: true },
        { key: "extra", label: "추가 요구사항", type: "textarea", required: false, placeholder: "정정문 게시, 재발 방지 약속 등 추가로 요구할 사항이 있으면 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 안녕을 기원합니다.");
        ps.push("2. 수신인은 " + fmtDate(d.postDate) + " 「" + d.postLocation + "」에 발신인에 관한 게시물을 게시하였습니다.\n※ 게시물 요지: " + d.postContent);
        ps.push("3. 위 게시물은 사실과 다르거나 발신인의 사회적 평가를 저하시키는 내용으로서, 발신인의 명예를 훼손하고 업무를 방해하는 것입니다. 이러한 행위는 형법 제307조(명예훼손) 및 정보통신망 이용촉진 및 정보보호 등에 관한 법률 제70조(허위사실 적시 시 7년 이하의 징역 등)에 해당할 수 있습니다.");
        ps.push("4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 게시물을 삭제하고 동일·유사한 내용의 게시를 중단하여 줄 것을 요청합니다." + (d.extra ? "\n※ 추가 요구사항: " + d.extra : ""));
        ps.push("5. 만일 위 기한까지 조치가 이루어지지 아니할 경우, 발신인은 정보통신서비스 제공자에 대한 임시조치 요청(정보통신망법 제44조의2), 형사 고소 및 민사상 손해배상 청구 등 법적 절차를 진행할 예정임을 엄중히 통지합니다.");
        return ps;
      }
    },

    mistransfer: {
      label: "착오송금 반환 청구",
      emoji: "🏦",
      sub: "잘못 보낸 돈을 돌려받아야 할 때",
      subject: "착오송금액 반환 청구의 건",
      fields: [
        { key: "transferDate", label: "송금일", type: "date", required: true },
        { key: "amount", label: "착오 송금액", type: "money", required: true },
        { key: "bankInfo", label: "잘못 송금한 계좌", type: "text", required: true, placeholder: "○○은행 000-0000-0000 (예금주: 수신인)", full: true },
        { key: "deadline", label: "반환 요청 기한", type: "date", required: true },
        { key: "myAccount", label: "반환받을 계좌", type: "text", required: false, placeholder: "○○은행 000-0000-0000 (예금주: 홍길동)", full: true },
        { key: "extra", label: "경위 보충", type: "textarea", required: false, placeholder: "은행을 통한 반환 요청 내역, 상대방과의 통화 내용 등이 있으면 적어 주세요.", full: true }
      ],
      build: function (d) {
        var ps = [];
        ps.push("1. 귀하의 안녕을 기원합니다.");
        ps.push("2. 발신인은 " + fmtDate(d.transferDate) + " 착오로 인하여 수신인 명의의 계좌(" + d.bankInfo + ")로 " + fmtMoney(d.amount) + "을 잘못 송금하였습니다." + (d.extra ? " " + d.extra : ""));
        ps.push("3. 수신인이 수령한 위 금원은 법률상 원인 없이 취득한 부당이득으로서, 민법 제741조에 따라 수신인은 이를 발신인에게 반환할 의무가 있습니다. 또한 판례는 착오로 송금된 돈임을 알면서 이를 임의로 소비하는 행위를 횡령죄로 처벌하고 있습니다.");
        var p4 = "4. 이에 발신인은 수신인에게 " + fmtDate(d.deadline) + "까지 위 " + fmtMoney(d.amount) + "을 반환하여 줄 것을 청구합니다.";
        if (d.myAccount) p4 += "\n※ 반환 계좌: " + d.myAccount;
        ps.push(p4);
        ps.push("5. 만일 위 기한까지 반환되지 아니할 경우, 발신인은 예금보험공사 착오송금 반환지원제도 이용, 부당이득반환 청구 소송 및 횡령죄 고소 등 법적 절차를 진행할 예정임을 알려드립니다.");
        return ps;
      }
    }
  };

  /* ---------- 공통(발신인/수신인) 필드 ---------- */
  var SENDER_FIELDS = [
    { key: "senderName", label: "이름", type: "text", required: true, placeholder: "홍길동" },
    { key: "senderPhone", label: "연락처", type: "text", required: false, placeholder: "010-0000-0000" },
    { key: "senderAddr", label: "주소", type: "text", required: true, placeholder: "서울특별시 ○○구 ○○로 12, 101동 1001호", full: true }
  ];

  var RECEIVER_FIELDS = [
    { key: "receiverName", label: "이름(상호)", type: "text", required: true, placeholder: "김철수 / 주식회사 ○○" },
    { key: "receiverPhone", label: "연락처", type: "text", required: false, placeholder: "아는 경우에만" },
    { key: "receiverAddr", label: "주소", type: "text", required: true, placeholder: "수신인의 주소 (내용증명은 주소로 발송됩니다)", full: true }
  ];

  /* ---------- 상태 ---------- */
  var state = {
    step: 0,           // 0: 사유, 1: 발신인, 2: 수신인, 3: 세부 내용, 4: 미리보기
    caseKey: null,
    data: {}
  };

  var STEP_META = [
    { label: "사유 선택" },
    { label: "보내는 분" },
    { label: "받는 분" },
    { label: "세부 내용" },
    { label: "미리보기" }
  ];

  var $panel = document.getElementById("wizardPanel");
  var $progress = document.getElementById("progress");
  var $toast = document.getElementById("toast");

  /* ---------- 진행 표시 렌더 ---------- */
  function renderProgress() {
    var html = "";
    for (var i = 0; i < STEP_META.length; i++) {
      var cls = i < state.step ? "done" : i === state.step ? "active" : "";
      html += '<div class="p-step ' + cls + '">' +
        '<span class="p-dot">' + (i < state.step ? "✓" : i + 1) + "</span>" +
        '<span class="p-label">' + STEP_META[i].label + "</span></div>";
      if (i < STEP_META.length - 1) html += '<div class="p-bar"></div>';
    }
    $progress.innerHTML = html;
  }

  /* ---------- 필드 렌더 ---------- */
  function renderField(f) {
    var val = state.data[f.key] != null ? state.data[f.key] : "";
    var reqMark = f.required
      ? '<span class="req">*</span>'
      : '<span class="opt">(선택)</span>';
    var html = '<div class="field' + (f.full ? " full" : "") + '">';
    html += "<label for=\"f_" + f.key + '">' + esc(f.label) + reqMark + "</label>";

    if (f.type === "textarea") {
      html += '<textarea id="f_' + f.key + '" data-key="' + f.key + '" placeholder="' + esc(f.placeholder || "") + '">' + esc(val) + "</textarea>";
    } else if (f.type === "select") {
      html += '<select id="f_' + f.key + '" data-key="' + f.key + '">';
      html += '<option value="">선택해 주세요</option>';
      f.options.forEach(function (o) {
        html += '<option value="' + esc(o) + '"' + (val === o ? " selected" : "") + ">" + esc(o) + "</option>";
      });
      html += "</select>";
    } else if (f.type === "money") {
      html += '<input type="text" inputmode="numeric" id="f_' + f.key + '" data-key="' + f.key + '" data-money="1" placeholder="' + esc(f.placeholder || "숫자만 입력") + '" value="' + (val ? comma(val) : "") + '">';
      html += '<div class="money-korean" id="k_' + f.key + '">' + (val ? "금 " + moneyToKorean(val) + " 원" : "") + "</div>";
    } else if (f.type === "date") {
      html += '<input type="date" id="f_' + f.key + '" data-key="' + f.key + '" value="' + esc(val) + '">';
    } else {
      html += '<input type="text" id="f_' + f.key + '" data-key="' + f.key + '" placeholder="' + esc(f.placeholder || "") + '" value="' + esc(val) + '">';
    }

    if (f.hint) html += '<div class="hint">' + esc(f.hint) + "</div>";
    html += '<div class="error-msg">필수 입력 항목입니다.</div>';
    html += "</div>";
    return html;
  }

  function bindFieldEvents() {
    $panel.querySelectorAll("[data-key]").forEach(function (el) {
      el.addEventListener("input", function () {
        var key = el.getAttribute("data-key");
        if (el.getAttribute("data-money")) {
          var raw = el.value.replace(/[^0-9]/g, "");
          state.data[key] = raw;
          el.value = raw ? comma(raw) : "";
          var kEl = document.getElementById("k_" + key);
          if (kEl) kEl.textContent = raw ? "금 " + moneyToKorean(raw) + " 원" : "";
        } else {
          state.data[key] = el.value;
        }
        el.classList.remove("error");
      });
      el.addEventListener("change", function () {
        state.data[el.getAttribute("data-key")] = el.getAttribute("data-money")
          ? el.value.replace(/[^0-9]/g, "")
          : el.value;
      });
    });
  }

  /* ---------- 검증 ---------- */
  function validate(fields) {
    var ok = true;
    fields.forEach(function (f) {
      if (!f.required) return;
      var v = (state.data[f.key] || "").trim();
      var el = document.getElementById("f_" + f.key);
      if (!v) {
        ok = false;
        if (el) el.classList.add("error");
      }
    });
    if (!ok) {
      var firstErr = $panel.querySelector(".error");
      if (firstErr) firstErr.focus();
    }
    return ok;
  }

  /* ---------- 단계 렌더 ---------- */
  function render() {
    renderProgress();
    window.scrollTo({ top: 0 });
    switch (state.step) {
      case 0: return renderStepCase();
      case 1: return renderStepParty("보내는 분(발신인) 정보", "작성하시는 분의 정보입니다. 문서 상단과 서명란에 들어갑니다.", SENDER_FIELDS);
      case 2: return renderStepParty("받는 분(수신인) 정보", "내용증명을 받을 상대방의 정보입니다. 주소가 정확해야 우편이 도달합니다.", RECEIVER_FIELDS);
      case 3: return renderStepDetail();
      case 4: return renderStepPreview();
    }
  }

  function navButtons(opts) {
    var html = '<div class="wizard-nav">';
    html += opts.back
      ? '<button class="btn btn-ghost" id="btnBack">← 이전</button>'
      : "<span></span>";
    html += '<span class="spacer"></span>';
    if (opts.next) html += '<button class="btn btn-primary" id="btnNext">' + opts.next + "</button>";
    html += "</div>";
    return html;
  }

  function bindNav(onNext) {
    var back = document.getElementById("btnBack");
    var next = document.getElementById("btnNext");
    if (back) back.addEventListener("click", function () { state.step--; render(); });
    if (next) next.addEventListener("click", onNext);
  }

  // 0단계: 사유 선택
  function renderStepCase() {
    var html = "<h2>어떤 일로 내용증명을 보내시나요?</h2>";
    html += '<p class="panel-desc">상황에 맞는 사유를 선택하면 그에 맞는 질문과 문구로 문서를 만들어 드립니다.</p>';
    html += '<div class="case-select">';
    Object.keys(TEMPLATES).forEach(function (key) {
      var t = TEMPLATES[key];
      html += '<button class="case-option' + (state.caseKey === key ? " selected" : "") + '" data-case="' + key + '">' +
        '<span class="emoji">' + t.emoji + "</span>" +
        "<span>" + t.label + "<small>" + t.sub + "</small></span></button>";
    });
    html += "</div>";
    html += navButtons({ back: false, next: "다음 →" });
    $panel.innerHTML = html;

    $panel.querySelectorAll(".case-option").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.caseKey = btn.getAttribute("data-case");
        $panel.querySelectorAll(".case-option").forEach(function (b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
      });
    });

    bindNav(function () {
      if (!state.caseKey) {
        showToast("사유를 먼저 선택해 주세요");
        return;
      }
      state.step = 1;
      render();
    });
  }

  // 1·2단계: 발신인/수신인
  function renderStepParty(title, desc, fields) {
    var html = "<h2>" + title + "</h2>";
    html += '<p class="panel-desc">' + desc + "</p>";
    html += '<div class="form-grid">';
    fields.forEach(function (f) { html += renderField(f); });
    html += "</div>";
    html += navButtons({ back: true, next: "다음 →" });
    $panel.innerHTML = html;
    bindFieldEvents();
    bindNav(function () {
      if (!validate(fields)) return;
      state.step++;
      render();
    });
  }

  // 3단계: 사유별 세부 내용
  function renderStepDetail() {
    var t = TEMPLATES[state.caseKey];
    var html = "<h2>" + t.emoji + " " + t.label + " — 세부 내용</h2>";
    html += '<p class="panel-desc">아래 내용을 바탕으로 본문이 자동으로 작성됩니다. 날짜와 금액은 정확하게 입력해 주세요.</p>';
    html += '<div class="form-grid">';
    t.fields.forEach(function (f) { html += renderField(f); });
    html += "</div>";
    html += navButtons({ back: true, next: "문서 만들기 →" });
    $panel.innerHTML = html;
    bindFieldEvents();
    bindNav(function () {
      if (!validate(t.fields)) return;
      state.step = 4;
      render();
    });
  }

  /* ---------- 문서 생성 ---------- */
  function buildDocHtml() {
    var t = TEMPLATES[state.caseKey];
    var d = state.data;
    var paragraphs = t.build(d);

    var html = '<div class="doc-title">내 용 증 명</div>';

    html += '<div class="doc-parties"><table>';
    html += "<tr><td class=\"role\" rowspan=\"" + (d.senderPhone ? 3 : 2) + '">발신인</td><td class="key">성  명</td><td>' + esc(d.senderName) + "</td></tr>";
    html += '<tr><td class="key">주  소</td><td>' + esc(d.senderAddr) + "</td></tr>";
    if (d.senderPhone) html += '<tr><td class="key">연락처</td><td>' + esc(d.senderPhone) + "</td></tr>";
    html += "<tr><td colspan=\"3\" style=\"height:8px\"></td></tr>";
    html += "<tr><td class=\"role\" rowspan=\"" + (d.receiverPhone ? 3 : 2) + '">수신인</td><td class="key">성  명</td><td>' + esc(d.receiverName) + "</td></tr>";
    html += '<tr><td class="key">주  소</td><td>' + esc(d.receiverAddr) + "</td></tr>";
    if (d.receiverPhone) html += '<tr><td class="key">연락처</td><td>' + esc(d.receiverPhone) + "</td></tr>";
    html += "</table></div>";

    html += '<div class="doc-subject">제 목 : ' + esc(t.subject) + "</div>";

    html += '<div class="doc-body">';
    paragraphs.forEach(function (p) {
      html += "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>";
    });
    html += "</div>";

    html += '<div class="doc-date">' + todayKorean() + "</div>";
    html += '<div class="doc-sign">발신인  ' + esc(d.senderName) + ' <span class="in">(인)</span></div>';
    return html;
  }

  function buildDocText() {
    var t = TEMPLATES[state.caseKey];
    var d = state.data;
    var lines = [];
    lines.push("내 용 증 명");
    lines.push("");
    lines.push("발신인");
    lines.push("  성  명 : " + d.senderName);
    lines.push("  주  소 : " + d.senderAddr);
    if (d.senderPhone) lines.push("  연락처 : " + d.senderPhone);
    lines.push("");
    lines.push("수신인");
    lines.push("  성  명 : " + d.receiverName);
    lines.push("  주  소 : " + d.receiverAddr);
    if (d.receiverPhone) lines.push("  연락처 : " + d.receiverPhone);
    lines.push("");
    lines.push("제 목 : " + t.subject);
    lines.push("");
    t.build(d).forEach(function (p) {
      lines.push(p);
      lines.push("");
    });
    lines.push(todayKorean());
    lines.push("발신인  " + d.senderName + " (인)");
    return lines.join("\n");
  }

  // 4단계: 미리보기
  function renderStepPreview() {
    var html = "<h2>완성된 내용증명</h2>";
    html += '<p class="panel-desc">내용을 확인하고 PDF로 저장하세요. 수정이 필요하면 이전 단계로 돌아갈 수 있습니다.</p>';
    html += '<div class="preview-toolbar">' +
      '<button class="btn btn-primary" id="btnPdf">🖨️ PDF로 저장 / 인쇄</button>' +
      '<button class="btn btn-ghost" id="btnCopy">📋 전문 복사 (인터넷우체국용)</button>' +
      '<button class="btn btn-ghost" id="btnTxt">⬇️ 텍스트 파일</button>' +
      "</div>";
    html += '<div class="doc-sheet" id="docSheet">' + buildDocHtml() + "</div>";
    html += '<div class="next-steps"><strong>📮 다음 단계: 이렇게 발송하세요</strong><ol>' +
      "<li><b>우체국 방문</b> — 같은 문서를 3부 출력해 가져가면 1부는 발송, 1부는 우체국 보관, 1부는 본인 보관용으로 처리됩니다.</li>" +
      "<li><b>인터넷우체국</b> — epost.go.kr에서 '전 문 복사' 버튼으로 복사한 내용을 붙여넣으면 방문 없이 발송됩니다.</li>" +
      "<li>발송 후 받는 <b>등기번호</b>로 배달 여부를 꼭 확인하고, 영수증과 등본은 보관하세요.</li>" +
      "</ol></div>";
    html += '<div class="disclaimer" style="margin-top:20px">⚠️<span>본 문서는 법률 자문이 아닌 <b>참고용 양식</b>입니다. 사안이 복잡하거나 금액이 크다면 변호사 등 전문가의 검토를 받으시길 권합니다.</span></div>';
    html += navButtons({ back: true, next: null });
    $panel.innerHTML = html;

    document.getElementById("btnPdf").addEventListener("click", function () {
      window.print();
    });

    document.getElementById("btnCopy").addEventListener("click", function () {
      var text = buildDocText();
      navigator.clipboard.writeText(text).then(function () {
        showToast("전문이 복사되었습니다. 인터넷우체국에 붙여넣으세요!");
      }).catch(function () {
        // 클립보드 API를 못 쓰는 환경에서는 임시 textarea 방식으로 대체
        var ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast("전문이 복사되었습니다!");
      });
    });

    document.getElementById("btnTxt").addEventListener("click", function () {
      var blob = new Blob([buildDocText()], { type: "text/plain;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "내용증명_" + (TEMPLATES[state.caseKey].label) + ".txt";
      a.click();
      URL.revokeObjectURL(a.href);
    });

    bindNav(function () {});
  }

  /* ---------- 토스트 ---------- */
  var toastTimer = null;
  function showToast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.classList.remove("show"); }, 2600);
  }

  /* ---------- 시작 ---------- */
  // URL 해시로 사유 사전 선택 지원 (예: write.html#jeonse)
  var hashCase = location.hash.replace("#", "");
  if (TEMPLATES[hashCase]) state.caseKey = hashCase;

  render();
})();
