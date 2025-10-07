/**
 * Извлекает структурированные данные из ответа бота для создания графиков и таблиц
 */

/**
 * Извлекает данные из ответа бота
 * @param {string} botResponse - Ответ бота в markdown-формате
 * @returns {Object} Структурированные данные
 */
export function extractDataForVisualization(botResponse) {
  const data = {
    inputData: {},
    results: {},
    contributionBreakdown: {},
    scenarios: {},
    charts: {},
  };

  const lines = botResponse.split('\n').map((line) => line.trim());

  // Извлекаем входные данные
  data.inputData = extractInputData(lines);

  // Извлекаем результаты
  data.results = extractResults(lines);

  // Извлекаем разбивку притока
  data.contributionBreakdown = extractContributionBreakdown(lines);

  // Извлекаем сценарии
  data.scenarios = extractScenarios(lines);

  // Генерируем данные для графиков
  data.charts = generateChartData(data);

  return data;
}

/**
 * Извлекает входные данные пользователя
 */
function extractInputData(lines) {
  const inputData = {};

  for (const line of lines) {
    if (line.includes('Возраст:')) {
      inputData.age = extractNumber(line);
    } else if (line.includes('Пол:')) {
      inputData.gender = line.split('Пол:')[1]?.trim();
    } else if (line.includes('Доход:')) {
      inputData.income = extractAmount(line);
    } else if (line.includes('Стартовый капитал:')) {
      inputData.startCapital = extractAmount(line);
    } else if (line.includes('Ставка НДФЛ:')) {
      inputData.taxRate = extractNumber(line);
    }
  }

  return inputData;
}

/**
 * Извлекает результаты расчёта
 */
function extractResults(lines) {
  const results = {};

  for (const line of lines) {
    if (line.includes('Требуемый взнос:')) {
      results.requiredContribution = extractAmount(line);
    } else if (line.includes('Прогноз капитала к началу выплат:')) {
      results.finalCapital = extractAmount(line);
    } else if (line.includes('Оценка ежемесячной выплаты')) {
      results.monthlyPayout = extractAmount(line);
    }
  }

  return results;
}

/**
 * Извлекает разбивку притока
 */
function extractContributionBreakdown(lines) {
  const breakdown = {
    personal: 0,
    government: 0,
    taxDeduction: 0,
  };

  for (const line of lines) {
    if (line.includes('💰 Личные взносы:')) {
      breakdown.personal = extractAmount(line);
    } else if (line.includes('🏛️ Господдержка:')) {
      breakdown.government = extractAmount(line);
    } else if (line.includes('💸 Налоговый вычет:')) {
      breakdown.taxDeduction = extractAmount(line);
    }
  }

  return breakdown;
}

/**
 * Извлекает сценарии
 */
function extractScenarios(lines) {
  const scenarios = {
    withReinvestment: {},
    withoutReinvestment: {},
  };

  // Простая логика - если есть данные о реинвесте
  const hasReinvestment = lines.some(
    (line) => line.includes('реинвест') || line.includes('Реинвестировать')
  );

  if (hasReinvestment) {
    scenarios.withReinvestment = {
      label: 'С реинвестом налогового вычета',
      capital: 0, // Будет заполнено из результатов
      payout: 0,
    };
    scenarios.withoutReinvestment = {
      label: 'Без реинвеста налогового вычета',
      capital: 0,
      payout: 0,
    };
  }

  return scenarios;
}

/**
 * Генерирует данные для графиков
 */
function generateChartData(data) {
  const charts = {};

  // Данные для графика накопления
  if (data.inputData.age && data.results.finalCapital) {
    charts.accumulationData = generateAccumulationData(data);
  }

  // Данные для круговой диаграммы притока
  if (data.contributionBreakdown.personal > 0) {
    charts.contributionBreakdown = {
      labels: ['Личные взносы', 'Господдержка', 'Налоговый вычет'],
      values: [
        data.contributionBreakdown.personal,
        data.contributionBreakdown.government,
        data.contributionBreakdown.taxDeduction,
      ],
    };
  }

  // Данные для сравнения сценариев
  if (data.scenarios.withReinvestment.label) {
    charts.scenariosComparison = {
      labels: [data.scenarios.withReinvestment.label, data.scenarios.withoutReinvestment.label],
      capital: [data.results.finalCapital, data.results.finalCapital * 0.85], // Примерное снижение без реинвеста
      payout: [data.results.monthlyPayout, data.results.monthlyPayout * 0.85],
    };
  }

  // Данные для прогноза выплат
  if (data.results.monthlyPayout) {
    charts.payoutForecast = generatePayoutForecast(data);
  }

  return charts;
}

/**
 * Генерирует данные для графика накопления по годам
 */
function generateAccumulationData(data) {
  const years = [];
  const values = [];
  const currentAge = data.inputData.age;
  const retirementAge = 60; // Предполагаемый возраст выхода на пенсию
  const yearsToRetirement = retirementAge - currentAge;

  // Начальный капитал
  let currentCapital = data.inputData.startCapital || 0;
  values.push(currentCapital);
  years.push(currentAge);

  // Годовой взнос
  const annualContribution = data.results.requiredContribution * 12;
  const annualReturn = 0.1; // 10% годовых

  // Рассчитываем накопления по годам
  for (let year = 1; year <= yearsToRetirement; year++) {
    currentCapital = currentCapital * (1 + annualReturn) + annualContribution;
    values.push(Math.round(currentCapital));
    years.push(currentAge + year);
  }

  return { years, values };
}

/**
 * Генерирует данные для прогноза выплат
 */
function generatePayoutForecast(data) {
  const months = [];
  const payouts = [];
  const monthlyPayout = data.results.monthlyPayout;
  const payoutPeriod = 270; // 22.5 года в месяцах

  for (let month = 1; month <= Math.min(payoutPeriod, 60); month++) {
    // Показываем первые 5 лет
    months.push(`Месяц ${month}`);
    payouts.push(monthlyPayout);
  }

  return { months, payouts };
}

/**
 * Извлекает число из строки
 */
function extractNumber(text) {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Извлекает денежную сумму из строки
 */
function extractAmount(text) {
  // Ищем числа с пробелами и символом ₽
  const match = text.match(/([\d\s]+)\s*₽/);
  if (match) {
    return parseInt(match[1].replace(/\s/g, ''), 10);
  }
  return 0;
}

/**
 * Создаёт таблицу входных данных
 */
export function createInputDataTable(inputData) {
  return {
    headers: ['Параметр', 'Значение'],
    rows: [
      ['Возраст', `${inputData.age} лет`],
      ['Пол', inputData.gender || 'Не указан'],
      ['Доход', `${inputData.income.toLocaleString('ru-RU')} ₽/мес`],
      ['Стартовый капитал', `${inputData.startCapital.toLocaleString('ru-RU')} ₽`],
      ['Ставка НДФЛ', `${inputData.taxRate}%`],
    ],
  };
}

/**
 * Создаёт таблицу результатов
 */
export function createResultsTable(results) {
  return {
    headers: ['Показатель', 'Значение'],
    rows: [
      ['Требуемый взнос', `${results.requiredContribution.toLocaleString('ru-RU')} ₽/мес`],
      ['Прогноз капитала', `${results.finalCapital.toLocaleString('ru-RU')} ₽`],
      ['Ежемесячная выплата', `${results.monthlyPayout.toLocaleString('ru-RU')} ₽`],
    ],
  };
}

/**
 * Создаёт таблицу разбивки притока
 */
export function createContributionTable(breakdown) {
  const total = breakdown.personal + breakdown.government + breakdown.taxDeduction;

  return {
    headers: ['Источник', 'Сумма в год', 'Доля'],
    rows: [
      [
        'Личные взносы',
        `${breakdown.personal.toLocaleString('ru-RU')} ₽`,
        `${((breakdown.personal / total) * 100).toFixed(1)}%`,
      ],
      [
        'Господдержка',
        `${breakdown.government.toLocaleString('ru-RU')} ₽`,
        `${((breakdown.government / total) * 100).toFixed(1)}%`,
      ],
      [
        'Налоговый вычет',
        `${breakdown.taxDeduction.toLocaleString('ru-RU')} ₽`,
        `${((breakdown.taxDeduction / total) * 100).toFixed(1)}%`,
      ],
      ['Итого', `${total.toLocaleString('ru-RU')} ₽`, '100%'],
    ],
  };
}
