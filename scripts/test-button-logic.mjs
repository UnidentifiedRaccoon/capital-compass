/**
 * Тестовый скрипт для проверки логики показа кнопки PDF
 */

// Импортируем функцию проверки (копируем её сюда для тестирования)
function isCalculationResponse(response) {
  const calculationIndicators = [
    '📊 Результаты:',
    'Требуемый взнос:',
    'Прогноз капитала',
    'Ежемесячная выплата',
    'Разбивка притока:',
    '💰 Личные взносы:',
    '🏛️ Господдержка:',
    '💸 Налоговый вычет:',
  ];

  return calculationIndicators.some((indicator) => response.includes(indicator));
}

// Тестовые ответы
const testResponses = [
  {
    name: 'Расчёт с результатами',
    text: `🎯 **Цель:** рассчитать необходимый взнос в ПДС

📊 **Результаты:**
- Требуемый взнос: 143 000 ₽ в месяц
- Прогноз капитала к началу выплат: 11 115 000 ₽
- Ежемесячная выплата: 150 000 ₽`,
    expected: true,
  },
  {
    name: 'Информационный ответ',
    text: `Программа долгосрочных сбережений (ПДС) — это государственная программа для накопления на пенсию с дополнительными льготами:

🏛️ Государственное софинансирование до 36 000 ₽ в год
💸 Налоговый вычет до 52 000 ₽ в год
🔒 Гарантирование средств государством до 2,8 млн ₽`,
    expected: false,
  },
  {
    name: 'Приветствие',
    text: `👋 Привет! Я Capital Compass AI.

🎯 Что я умею:
• Рассчитать взносы по ПДС
• Спрогнозировать капитал к пенсии
• Вычислить ежемесячную выплату`,
    expected: false,
  },
  {
    name: 'Расчёт с разбивкой притока',
    text: `📊 **Результаты:**
- Требуемый взнос: 50 000 ₽ в месяц

Разбивка притока:
- 💰 Личные взносы: 600 000 ₽ в год
- 🏛️ Господдержка: 300 000 ₽ в год
- 💸 Налоговый вычет: 78 000 ₽ в год`,
    expected: true,
  },
  {
    name: 'Ошибка',
    text: `❌ Не удалось получить ответ. Попробуйте ещё раз позже.`,
    expected: false,
  },
];

function testButtonLogic() {
  console.log('🧪 Тестируем логику показа кнопки PDF...\n');

  let passed = 0;
  let failed = 0;

  for (const test of testResponses) {
    const result = isCalculationResponse(test.text);
    const status = result === test.expected ? '✅' : '❌';

    console.log(`${status} ${test.name}`);
    console.log(
      `   Ожидалось: ${test.expected ? 'показать кнопку PDF' : 'НЕ показывать кнопку PDF'}`
    );
    console.log(`   Получено: ${result ? 'показать кнопку PDF' : 'НЕ показывать кнопку PDF'}`);
    console.log(`   Текст: ${test.text.substring(0, 50)}...\n`);

    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`📊 Результаты тестирования:`);
  console.log(`   ✅ Пройдено: ${passed}`);
  console.log(`   ❌ Провалено: ${failed}`);
  console.log(`   📈 Успешность: ${Math.round((passed / testResponses.length) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 Все тесты прошли успешно!');
  } else {
    console.log('\n⚠️ Некоторые тесты провалились. Проверьте логику.');
  }
}

// Запускаем тесты
testButtonLogic();
