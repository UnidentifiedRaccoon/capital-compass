/**
 * Парсер markdown-ответов бота в HTML для PDF-отчётов
 * Обрабатывает специальный формат ответов Capital Compass AI
 * Поддерживает таблицы, графики и визуализации
 */

import {
  extractDataForVisualization,
  createInputDataTable,
  createResultsTable,
  createContributionTable,
} from './dataExtractor.js';
import { createChartsHtml, createTableHtml, createProgressBar } from './chartGenerator.js';

/**
 * Эмодзи-словарь для консистентного отображения
 */
const EMOJI_MAP = {
  '🎯': 'Цель',
  '📥': 'Входные данные',
  '📊': 'Результаты',
  '🎛️': 'Сценарии',
  '💡': 'Подсказки',
  '⚠️': 'Ограничения/риски',
  '🏛️': 'Господдержка',
  '💸': 'Налоговый вычет',
  '💰': 'Личные взносы',
  '📈': 'Доходность/рост',
  '📉': 'Снижение',
  '🔁': 'Реинвестирование вычета',
};

/**
 * Проверяет, является ли символ эмодзи секции
 * @param {string} char - Символ для проверки
 * @returns {boolean} true если это эмодзи секции
 */
function isSectionEmoji(char) {
  return Object.keys(EMOJI_MAP).includes(char);
}

/**
 * Парсит markdown-текст ответа бота в HTML
 * @param {string} markdownText - Текст ответа бота в markdown-формате
 * @returns {string} HTML-контент
 */
export function parseMarkdownToHtml(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') {
    return '<p>Нет данных для отображения</p>';
  }

  // Разбиваем текст на строки
  const lines = markdownText.split('\n').map((line) => line.trim());
  let html = '';
  let currentSection = null;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Пропускаем пустые строки
    if (!line) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      continue;
    }

    // Проверяем на заголовок секции (начинается с эмодзи)
    const sectionMatch = line.match(/^(\S)\s*\*\*(.*?)\*\*:\s*(.*)$/);
    if (sectionMatch && isSectionEmoji(sectionMatch[1])) {
      const [, emoji, title, content] = sectionMatch;
      const sectionTitle = EMOJI_MAP[emoji] || title;

      // Закрываем предыдущий список если был
      if (inList) {
        html += '</ul>';
        inList = false;
      }

      // Закрываем предыдущую секцию
      if (currentSection) {
        html += '</div>';
      }

      // Начинаем новую секцию
      currentSection = emoji;
      html += `<div class="section">
        <div class="section-title">
          <span class="emoji">${emoji}</span>
          <span>${sectionTitle}</span>
        </div>
        <div class="section-content">`;

      if (content) {
        html += `<p>${escapeHtml(content)}</p>`;
      }
      continue;
    }

    // Проверяем на заголовок секции без двоеточия
    const sectionMatch2 = line.match(/^(\S)\s*\*\*(.*?)\*\*$/);
    if (sectionMatch2 && isSectionEmoji(sectionMatch2[1])) {
      const [, emoji, title] = sectionMatch2;
      const sectionTitle = EMOJI_MAP[emoji] || title;

      // Закрываем предыдущий список если был
      if (inList) {
        html += '</ul>';
        inList = false;
      }

      // Закрываем предыдущую секцию
      if (currentSection) {
        html += '</div>';
      }

      // Начинаем новую секцию
      currentSection = emoji;
      html += `<div class="section">
        <div class="section-title">
          <span class="emoji">${emoji}</span>
          <span>${sectionTitle}</span>
        </div>
        <div class="section-content">`;
      continue;
    }

    // Проверяем на элемент списка (начинается с • или —)
    const listItemMatch = line.match(/^[•—]\s*(.*)$/);
    if (listItemMatch) {
      const content = listItemMatch[1];

      if (!inList) {
        html += '<ul>';
        inList = true;
      }

      // Обрабатываем специальные случаи для результатов
      if (currentSection === '📊') {
        html += formatResultItem(content);
      } else {
        html += `<li>${escapeHtml(content)}</li>`;
      }
      continue;
    }

    // Проверяем на подзаголовок (начинается с • но без пробела после)
    const subheaderMatch = line.match(/^•\s*([^:]+):\s*(.*)$/);
    if (subheaderMatch) {
      const [, subheader, content] = subheaderMatch;

      // Закрываем предыдущий список если был
      if (inList) {
        html += '</ul>';
        inList = false;
      }

      html += `<div class="highlight-box">
        <div class="title">${escapeHtml(subheader)}</div>
        <div class="content">${escapeHtml(content)}</div>
      </div>`;
      continue;
    }

    // Обычный текст
    if (currentSection) {
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<p>${escapeHtml(line)}</p>`;
    } else {
      // Если нет активной секции, создаём общий блок
      if (inList) {
        html += '</ul>';
        inList = false;
      }
      html += `<div class="section">
        <div class="section-content">
          <p>${escapeHtml(line)}</p>
        </div>
      </div>`;
    }
  }

  // Закрываем последний список и секцию
  if (inList) {
    html += '</ul>';
  }
  if (currentSection) {
    html += '</div></div>';
  }

  return html;
}

/**
 * Форматирует элемент результата с выделением сумм
 * @param {string} content - Содержимое элемента
 * @returns {string} HTML-элемент
 */
function formatResultItem(content) {
  // Ищем денежные суммы в формате "123 456 ₽"
  const moneyRegex = /(\d+[\s\d]*)\s*₽/g;
  const formattedContent = content.replace(moneyRegex, '<span class="amount">$&</span>');

  return `<li>${formattedContent}</li>`;
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

/**
 * Создаёт HTML-отчёт из ответа бота
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @param {Object} options - Дополнительные опции
 * @param {string} options.reportDate - Дата отчёта
 * @returns {string} Полный HTML-отчёт
 */
export function createReportHtml(botResponse, options = {}) {
  const reportDate =
    options.reportDate ||
    new Date().toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  // Извлекаем данные для визуализации
  const visualizationData = extractDataForVisualization(botResponse);

  // Создаём основной контент
  const content = parseMarkdownToHtml(botResponse);

  // Добавляем таблицы и графики
  const enhancedContent = addVisualizations(content, visualizationData);

  // Читаем шаблон
  const template = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчёт по пенсионным накоплениям - Capital Compass AI</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
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
            font-size: 14px;
        }
        
        .container {
            max-width: 800px;
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
            font-size: 28px;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 16px;
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
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .section-content {
            font-size: 14px;
            color: #374151;
        }
        
        .section-content ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .section-content li {
            margin-bottom: 8px;
        }
        
        .highlight-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .highlight-box .title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .data-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
        }
        
        .data-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .data-item:last-child {
            border-bottom: none;
        }
        
        .data-label {
            font-weight: 500;
            color: #4b5563;
        }
        
        .data-value {
            font-weight: 600;
            color: #1f2937;
        }
        
        .amount {
            color: #059669;
            font-weight: 600;
        }
        
        .warning {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .warning .title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 5px;
        }
        
        .warning .content {
            color: #92400e;
            font-size: 13px;
        }
        
        .tip {
            background: #ecfdf5;
            border: 1px solid #10b981;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
        }
        
        .tip .title {
            font-weight: 600;
            color: #065f46;
            margin-bottom: 5px;
        }
        
        .tip .content {
            color: #065f46;
            font-size: 13px;
        }
        
        .scenario {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 15px;
            margin: 10px 0;
        }
        
        .scenario-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
        }
        
        .emoji {
            font-size: 16px;
            margin-right: 6px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        
        .footer .disclaimer {
            margin-top: 10px;
            font-style: italic;
        }
        
        /* Стили для таблиц */
        .table-container {
            margin: 20px 0;
            overflow-x: auto;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .data-table th {
            background: #f8fafc;
            color: #374151;
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid #e5e7eb;
        }
        
        .data-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .data-table tr:hover {
            background: #f8fafc;
        }
        
        .amount-cell {
            font-weight: 600;
            color: #059669;
        }
        
        /* Стили для графиков */
        .chart-container {
            margin: 30px 0;
            padding: 20px;
            background: #f8fafc;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        
        .chart-container h3 {
            margin-bottom: 20px;
            color: #1f2937;
            font-size: 18px;
            font-weight: 600;
        }
        
        .chart-container canvas {
            max-width: 100%;
            height: auto;
        }
        
        /* Стили для прогресс-баров */
        .progress-container {
            margin: 20px 0;
        }
        
        .progress-label {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
        }
        
        .progress-bar {
            width: 100%;
            height: 12px;
            background: #e5e7eb;
            border-radius: 6px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            transition: width 0.3s ease;
        }
        
        .progress-text {
            margin-top: 8px;
            font-size: 14px;
            color: #6b7280;
        }
        
        @media print {
            body {
                font-size: 12px;
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
            ${enhancedContent}
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
 * Добавляет визуализации (таблицы и графики) к контенту
 * @param {string} content - Основной HTML-контент
 * @param {Object} data - Данные для визуализации
 * @returns {string} Контент с визуализациями
 */
function addVisualizations(content, data) {
  let enhancedContent = content;

  // Добавляем таблицы после соответствующих секций
  if (data.inputData && Object.keys(data.inputData).length > 0) {
    const inputTable = createTableHtml(createInputDataTable(data.inputData));
    enhancedContent = enhancedContent.replace(
      /(<div class="section-title">.*?📥.*?Входные данные.*?<\/div>)/,
      `$1${inputTable}`
    );
  }

  if (data.results && Object.keys(data.results).length > 0) {
    const resultsTable = createTableHtml(createResultsTable(data.results));
    enhancedContent = enhancedContent.replace(
      /(<div class="section-title">.*?📊.*?Результаты.*?<\/div>)/,
      `$1${resultsTable}`
    );
  }

  if (data.contributionBreakdown && data.contributionBreakdown.personal > 0) {
    const contributionTable = createTableHtml(createContributionTable(data.contributionBreakdown));
    enhancedContent = enhancedContent.replace(
      /(<div class="section-title">.*?📊.*?Результаты.*?<\/div>.*?<\/div>)/,
      `$1${contributionTable}`
    );
  }

  // Добавляем графики в конец контента
  const chartsHtml = createChartsHtml(data.charts);
  if (chartsHtml) {
    enhancedContent += `
      <div class="section">
        <div class="section-title">
          <span class="emoji">📈</span>
          <span>Визуализация данных</span>
        </div>
        <div class="section-content">
          ${chartsHtml}
        </div>
      </div>
    `;
  }

  // Добавляем прогресс-бар достижения цели
  if (data.results.finalCapital && data.results.requiredContribution) {
    const targetCapital = data.results.finalCapital;
    const currentCapital = data.inputData.startCapital || 0;
    const progressBar = createProgressBar(
      currentCapital,
      targetCapital,
      'Прогресс достижения цели'
    );

    enhancedContent = enhancedContent.replace(
      /(<div class="section-title">.*?📊.*?Результаты.*?<\/div>)/,
      `$1${progressBar}`
    );
  }

  return enhancedContent;
}
