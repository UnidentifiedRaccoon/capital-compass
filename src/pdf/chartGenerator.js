/**
 * Генератор графиков и диаграмм для PDF-отчётов
 * Использует Chart.js для создания красивых визуализаций
 */

/**
 * Создаёт HTML с Chart.js для отображения графиков
 * @param {Object} data - Данные для визуализации
 * @returns {string} HTML с графиками
 */
export function createChartsHtml(data) {
  const charts = [];

  // 1. График динамики накопления
  if (data.accumulationData) {
    charts.push(createAccumulationChart(data.accumulationData));
  }

  // 2. Круговая диаграмма структуры притока
  if (data.contributionBreakdown) {
    charts.push(createContributionPieChart(data.contributionBreakdown));
  }

  // 3. Столбчатая диаграмма сравнения сценариев
  if (data.scenariosComparison) {
    charts.push(createScenariosChart(data.scenariosComparison));
  }

  // 4. График прогноза выплат
  if (data.payoutForecast) {
    charts.push(createPayoutChart(data.payoutForecast));
  }

  return charts.join('\n');
}

/**
 * Создаёт график динамики накопления капитала
 */
function createAccumulationChart(data) {
  return `
    <div class="chart-container">
      <h3>📈 Динамика накопления капитала</h3>
      <canvas id="accumulationChart" width="400" height="200"></canvas>
      <script>
        const ctx = document.getElementById('accumulationChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(data.years)},
            datasets: [{
              label: 'Накопленный капитал',
              data: ${JSON.stringify(data.values)},
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return 'Капитал: ' + context.parsed.y.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            }
          }
        });
      </script>
    </div>
  `;
}

/**
 * Создаёт круговую диаграмму структуры притока
 */
function createContributionPieChart(data) {
  return `
    <div class="chart-container">
      <h3>🥧 Структура годового притока</h3>
      <canvas id="contributionChart" width="300" height="300"></canvas>
      <script>
        const ctx = document.getElementById('contributionChart').getContext('2d');
        new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify(data.labels)},
            datasets: [{
              data: ${JSON.stringify(data.values)},
              backgroundColor: [
                '#10b981', // Личные взносы - зелёный
                '#3b82f6', // Господдержка - синий
                '#f59e0b'  // Налоговый вычет - оранжевый
              ],
              borderWidth: 2,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  padding: 20,
                  usePointStyle: true
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return context.label + ': ' + 
                           context.parsed.toLocaleString('ru-RU') + ' ₽ (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });
      </script>
    </div>
  `;
}

/**
 * Создаёт столбчатую диаграмму сравнения сценариев
 */
function createScenariosChart(data) {
  return `
    <div class="chart-container">
      <h3>📊 Сравнение сценариев</h3>
      <canvas id="scenariosChart" width="400" height="250"></canvas>
      <script>
        const ctx = document.getElementById('scenariosChart').getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(data.labels)},
            datasets: [{
              label: 'Итоговый капитал',
              data: ${JSON.stringify(data.capital)},
              backgroundColor: '#3b82f6',
              borderColor: '#1d4ed8',
              borderWidth: 1
            }, {
              label: 'Ежемесячная выплата',
              data: ${JSON.stringify(data.payout)},
              backgroundColor: '#10b981',
              borderColor: '#059669',
              borderWidth: 1,
              yAxisID: 'y1'
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text: 'Капитал (₽)'
                },
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                  display: true,
                  text: 'Выплата (₽/мес)'
                },
                grid: {
                  drawOnChartArea: false,
                },
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.dataset.label + ': ' + 
                           context.parsed.y.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            }
          }
        });
      </script>
    </div>
  `;
}

/**
 * Создаёт график прогноза выплат
 */
function createPayoutChart(data) {
  return `
    <div class="chart-container">
      <h3>💰 Прогноз ежемесячных выплат</h3>
      <canvas id="payoutChart" width="400" height="200"></canvas>
      <script>
        const ctx = document.getElementById('payoutChart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(data.months)},
            datasets: [{
              label: 'Ежемесячная выплата',
              data: ${JSON.stringify(data.payouts)},
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return 'Выплата: ' + context.parsed.y.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value.toLocaleString('ru-RU') + ' ₽';
                  }
                }
              }
            }
          }
        });
      </script>
    </div>
  `;
}

/**
 * Создаёт HTML-таблицу с данными
 * @param {Object} tableData - Данные таблицы
 * @returns {string} HTML таблицы
 */
export function createTableHtml(tableData) {
  if (!tableData || !tableData.headers || !tableData.rows) {
    return '';
  }

  let html = '<div class="table-container">';
  html += '<table class="data-table">';

  // Заголовки
  html += '<thead><tr>';
  tableData.headers.forEach((header) => {
    html += `<th>${header}</th>`;
  });
  html += '</tr></thead>';

  // Строки данных
  html += '<tbody>';
  tableData.rows.forEach((row) => {
    html += '<tr>';
    row.forEach((cell) => {
      const isAmount = typeof cell === 'string' && cell.includes('₽');
      const cellClass = isAmount ? 'amount-cell' : '';
      html += `<td class="${cellClass}">${cell}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';

  html += '</table></div>';

  return html;
}

/**
 * Создаёт прогресс-бар для визуализации достижения цели
 * @param {number} current - Текущее значение
 * @param {number} target - Целевое значение
 * @param {string} label - Подпись
 * @returns {string} HTML прогресс-бара
 */
export function createProgressBar(current, target, label) {
  const percentage = Math.min((current / target) * 100, 100);

  return `
    <div class="progress-container">
      <div class="progress-label">${label}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="progress-text">
        ${current.toLocaleString('ru-RU')} ₽ из ${target.toLocaleString('ru-RU')} ₽ (${percentage.toFixed(1)}%)
      </div>
    </div>
  `;
}
