/**
 * Простой парсер markdown-ответов бота в HTML для PDF-отчётов
 * Создает минималистичный отчет с ключевой информацией
 */

/**
 * Извлекает ключевые данные из ответа бота для простого отчета
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @returns {Object} Структурированные данные для простого отчета
 */
export function extractSimpleData(botResponse) {
  const data = {
    goal: '',
    results: [],
    scenarios: [],
    tips: [],
    risks: [],
  };

  // Обрабатываем null/undefined
  if (!botResponse || typeof botResponse !== 'string') {
    return data;
  }

  const lines = botResponse.split('\n').map((line) => line.trim());

  // Извлекаем цель
  for (const line of lines) {
    if (line.includes('🎯') && line.includes('Цель:')) {
      data.goal = line
        .replace(/.*🎯.*Цель:\s*/, '')
        .replace(/\*\*/g, '')
        .trim();
      break;
    }
  }

  // Извлекаем результаты
  let inResults = false;
  for (const line of lines) {
    if (line.includes('📊') && line.includes('Результаты')) {
      inResults = true;
      continue;
    }
    if (inResults && (line.includes('🎛️') || line.includes('💡') || line.includes('⚠️'))) {
      inResults = false;
    }
    if (inResults && line.startsWith('•')) {
      data.results.push(line.replace('•', '').trim());
    }
  }

  // Извлекаем сценарии
  let inScenarios = false;
  for (const line of lines) {
    if (line.includes('🎛️') && line.includes('Сценарии')) {
      inScenarios = true;
      continue;
    }
    if (inScenarios && (line.includes('💡') || line.includes('⚠️'))) {
      inScenarios = false;
    }
    if (inScenarios && line.startsWith('•')) {
      data.scenarios.push(line.replace('•', '').trim());
    }
  }

  // Извлекаем подсказки
  let inTips = false;
  for (const line of lines) {
    if (line.includes('💡') && line.includes('Подсказки')) {
      inTips = true;
      continue;
    }
    if (inTips && line.includes('⚠️')) {
      inTips = false;
    }
    if (inTips && line.startsWith('•')) {
      data.tips.push(line.replace('•', '').trim());
    }
  }

  // Извлекаем ограничения/риски
  let inRisks = false;
  for (const line of lines) {
    if (line.includes('⚠️') && (line.includes('Ограничения') || line.includes('риски'))) {
      inRisks = true;
      continue;
    }
    if (inRisks && line.includes('🎯')) {
      inRisks = false;
    }
    if (inRisks && line.startsWith('•')) {
      data.risks.push(line.replace('•', '').trim());
    }
  }

  return data;
}

/**
 * Создает простой HTML-отчет
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @param {Object} options - Дополнительные опции
 * @param {string} options.reportDate - Дата отчёта
 * @returns {string} Полный HTML-отчёт
 */
export function createSimpleReportHtml(botResponse, options = {}) {
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Извлекаем данные для простого отчета
  const data = extractSimpleData(botResponse);

  // Создаем контент
  const content = createSimpleContent(data);

  // HTML шаблон
  const template = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчёт по пенсионным накоплениям - Capital Compass AI</title>
    <style>
        /* Используем системные шрифты вместо Google Fonts для serverless */
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: #ffffff;
            font-size: 16px;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 30px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #2563eb;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 14px;
            color: #6b7280;
            font-weight: 400;
        }
        
        .report-date {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 10px;
        }
        
        .content {
            line-height: 1.8;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .section-content {
            font-size: 14px;
            color: #374151;
        }
        
        .section-content ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        .section-content li {
            margin-bottom: 6px;
        }
        
        .amount {
            color: #059669;
            font-weight: 600;
        }
        
        .emoji {
            font-size: 14px;
            margin-right: 6px;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 11px;
        }
        
        .footer .disclaimer {
            margin-top: 8px;
            font-style: italic;
        }
        
        @media print {
            body {
                font-size: 14px;
            }
            
            .container {
                padding: 20px;
            }
            
            .header {
                margin-bottom: 30px;
            }
            
            .section {
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎯 Capital Compass AI</div>
            <div class="subtitle">Отчёт по пенсионным накоплениям</div>
            <div class="report-date">${reportDate}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="footer">
            <div>Сгенерировано ботом Capital Compass AI</div>
            <div class="disclaimer">
                Данный отчёт носит информационный характер. 
                Расчёты основаны на фиксированной доходности 10% годовых. 
                Реальные результаты могут отличаться.
            </div>
        </div>
    </div>
</body>
</html>`;

  return template;
}

/**
 * Создает простой контент отчета
 * @param {Object} data - Данные для отчета
 * @returns {string} HTML-контент
 */
function createSimpleContent(data) {
  let html = '';

  // Цель
  if (data.goal) {
    html += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">🎯</span>
          <span>Цель</span>
        </div>
        <div class="section-content">
          <p>${escapeHtml(data.goal)}</p>
        </div>
      </div>
    `;
  }

  // Результаты расчёта
  if (data.results.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">📊</span>
          <span>Результаты расчёта</span>
        </div>
        <div class="section-content">
          <ul>
    `;

    data.results.forEach((result) => {
      // Выделяем денежные суммы
      const formattedResult = result.replace(/(\d+[\s\d]*)\s*₽/g, '<span class="amount">$&</span>');
      html += `<li>${formattedResult}</li>`;
    });

    html += `
          </ul>
        </div>
      </div>
    `;
  }

  // Сценарии
  if (data.scenarios.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">🎛️</span>
          <span>Сценарии</span>
        </div>
        <div class="section-content">
          <ul>
    `;

    data.scenarios.forEach((scenario) => {
      html += `<li>${escapeHtml(scenario)}</li>`;
    });

    html += `
          </ul>
        </div>
      </div>
    `;
  }

  // Подсказки
  if (data.tips.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">💡</span>
          <span>Подсказки</span>
        </div>
        <div class="section-content">
          <ul>
    `;

    data.tips.forEach((tip) => {
      html += `<li>${escapeHtml(tip)}</li>`;
    });

    html += `
          </ul>
        </div>
      </div>
    `;
  }

  // Ограничения/риски
  if (data.risks.length > 0) {
    html += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">⚠️</span>
          <span>Ограничения/риски</span>
        </div>
        <div class="section-content">
          <ul>
    `;

    data.risks.forEach((risk) => {
      html += `<li>${escapeHtml(risk)}</li>`;
    });

    html += `
          </ul>
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * Экранирует HTML-символы
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
}
