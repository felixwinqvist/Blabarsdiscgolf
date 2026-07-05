const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {};
const SUPABASE_URL = normalizeSupabaseUrl(SUPABASE_CONFIG.url || '');
const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey || '';
const SUPABASE_TABLE = SUPABASE_CONFIG.table || 'scores';

// Hämta eller skapa spelarlista
let players = [];
let isOnline = true;

// Par för varje hål (1-9)
const holePars = [3, 4, 3, 3, 3, 3, 4, 4, 4];

function normalizeSupabaseUrl(url) {
  const trimmedUrl = url.trim().replace(/\/$/, '');

  if (!trimmedUrl) {
    return '';
  }

  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}.supabase.co`;
}

function hasSupabaseConfig() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('DIN_SUPABASE_URL') &&
    !SUPABASE_ANON_KEY.includes('DIN_SUPABASE_ANON_KEY')
  );
}

// Hjälpfunktion för att göra API-anrop till Supabase
async function callSupabase(method, endpoint = '', data = null) {
  if (!hasSupabaseConfig()) {
    isOnline = false;
    return { success: false, message: 'Supabase är inte konfigurerat än.' };
  }

  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      }
    };

    if (method === 'POST') {
      options.headers.Prefer = 'return=representation';
    }

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Fel vid anslutning till Supabase:', error);
    isOnline = false;
    return { success: false, message: 'Offline mode', error: error.message };
  }
}

// Ladda spelare från Supabase
async function loadPlayers() {
  // Försök hämta unika spelare från Supabase
  const result = await callSupabase('GET', '?select=namn&order=namn.asc');
  
  if (result.success && result.data) {
    // Extrahera unika spelarnamn
    const uniquePlayers = [...new Set(result.data.map(row => row.namn))];
    players = uniquePlayers.filter(name => name && name.trim() !== '');
    isOnline = true;
  } else {
    // Fallback till localStorage
    players = JSON.parse(localStorage.getItem("players")) || [];
    isOnline = false;
  }
}

function renderPlayerList() {
  const list = document.getElementById("player-list");
  if (!list) return;
  
  list.innerHTML = '';
  
  if (!isOnline) {
    const offlineWarning = document.createElement("div");
    offlineWarning.innerHTML = '<p class="status-message status-offline">⚠️ Offline läge - data sparas lokalt</p>';
    list.appendChild(offlineWarning);
  }
  
  players.forEach((player, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>
        <input type="checkbox" name="player" value="${player}"/>
        <span>${player}</span>
      </label>
    `;
    const checkbox = div.querySelector("input");
    const syncSelectedState = () => {
      div.classList.toggle("selected", checkbox.checked);
    };
    checkbox.addEventListener("change", syncSelectedState);
    div.querySelector("label").addEventListener("click", () => {
      setTimeout(syncSelectedState, 0);
    });
    list.appendChild(div);
  });
}

async function addPlayer() {
  const input = document.getElementById("new-player");
  const name = input.value.trim();
  if (name && !players.includes(name)) {
    players.push(name);
    
    if (isOnline) {
      // Lägg till spelare i Supabase (kommer att sparas automatiskt när de spelar)
      // Men uppdatera listan direkt
    } else {
      // Fallback till localStorage
      localStorage.setItem("players", JSON.stringify(players));
    }
    
    renderPlayerList();
    input.value = '';
  }
}

function startGame() {
  const selected = [...document.querySelectorAll("input[name='player']:checked")]
    .map(input => input.value);

  if (selected.length === 0) {
    alert("Välj minst en spelare!");
    return;
  }

  // Spara valda spelare till localStorage (tillfälligt)
  localStorage.setItem("currentPlayers", JSON.stringify(selected));
  localStorage.setItem("isOnline", isOnline.toString());
  location.href = "score.html";
}

// Initialisera när sidan laddas
window.addEventListener('load', async () => {
  if (document.getElementById("player-list")) {
    await loadPlayers();
    renderPlayerList();
  }
});

// Funktion för att färga poäng baserat på par
function colorScoreByPar(input, holeIndex) {
  const score = parseInt(input.value);
  const par = holePars[holeIndex];
  
  if (isNaN(score) || score === 0) {
    input.style.color = '#495057';
    input.style.backgroundColor = 'white';
    return;
  }
  
  if (score < par) {
    input.style.color = '#28a745';
    input.style.backgroundColor = '#d4edda';
  } else if (score === par) {
    input.style.color = '#007bff';
    input.style.backgroundColor = '#cce7ff';
  } else {
    input.style.color = '#dc3545';
    input.style.backgroundColor = '#f8d7da';
  }
}

// SCORE PAGE - Skapa score-ruta för varje spelare och hål (nu med mobil-kompatibilitet)
function renderScoreForm() {
  const players = JSON.parse(localStorage.getItem("currentPlayers")) || [];
  const scoreTable = document.getElementById("score-table");
  const onlineStatus = localStorage.getItem("isOnline") === 'true';

  if (!players.length) {
    scoreTable.innerHTML = "<p>Inga spelare valda!</p>";
    return;
  }

  const holeCount = 9;
  let html = "";
  
  // Visa online/offline status
  if (!onlineStatus) {
    html += '<div class="status-message status-offline">⚠️ Offline läge - data sparas lokalt</div>';
  } else {
    html += '<div class="status-message status-online">🌐 Online - data sparas till Supabase</div>';
  }
  
  // Desktop tabell (dold på mobil)
  html += "<table><thead><tr><th>Spelare</th>";

  for (let i = 1; i <= holeCount; i++) {
    html += `<th>Hål ${i}<br><small>(Par ${holePars[i-1]})</small></th>`;
  }
  html += "<th>Totalt</th></tr></thead><tbody>";

  players.forEach(player => {
    html += `<tr><td>${player}</td>`;
    for (let i = 0; i < holeCount; i++) {
      html += `<td><input type="number" name="${player}-hole${i}" min="1" required /></td>`;
    }
    html += `<td class="total-score" id="total-${player}">0</td></tr>`;
  });

  html += "</tbody></table>";
  
  // Mobil layout (dold på desktop)
  html += '<div class="mobile-score-layout">';
  
  players.forEach(player => {
    html += `
      <div class="mobile-player-card">
        <div class="mobile-player-header">
          <span>${player}</span>
          <div class="mobile-total-score" id="mobile-total-${player}">0</div>
        </div>
        <div class="mobile-holes-grid">`;
    
    for (let i = 0; i < holeCount; i++) {
      html += `
        <div class="mobile-hole-input">
          <div class="mobile-hole-label">Hål ${i + 1}</div>
          <div class="mobile-hole-par">Par ${holePars[i]}</div>
          <input type="number" name="${player}-hole${i}-mobile" min="1" required />
        </div>`;
    }
    
    html += `
        </div>
      </div>`;
  });
  
  html += '</div>';
  
  scoreTable.innerHTML = html;

  // Lägg till event listeners för både desktop och mobil inputs
  const allInputs = scoreTable.querySelectorAll('input[type="number"]');
  allInputs.forEach(input => {
    let nameparts, holeIndex, playerName;
    
    if (input.name.includes('-mobile')) {
      // Mobil input
      nameparts = input.name.replace('-mobile', '').split('-hole');
      holeIndex = parseInt(nameparts[1]);
      playerName = nameparts[0];
    } else {
      // Desktop input
      nameparts = input.name.split('-hole');
      holeIndex = parseInt(nameparts[1]);
      playerName = nameparts[0];
    }
    
    input.addEventListener('input', function() {
      colorScoreByPar(this, holeIndex);
      
      // Synka värden mellan desktop och mobil inputs
      const isMobile = this.name.includes('-mobile');
      const otherInput = isMobile 
        ? scoreTable.querySelector(`[name='${playerName}-hole${holeIndex}']`)
        : scoreTable.querySelector(`[name='${playerName}-hole${holeIndex}-mobile']`);
      
      if (otherInput) {
        otherInput.value = this.value;
        colorScoreByPar(otherInput, holeIndex);
      }
      
      updateTotalScore(playerName);
    });
  });
}

function updateTotalScore(player) {
  let total = 0;
  for (let i = 0; i < 9; i++) {
    const input = document.querySelector(`[name='${player}-hole${i}']`);
    const score = parseInt(input.value) || 0;
    total += score;
  }
  
  // Uppdatera både desktop och mobil totaler
  const totalElement = document.getElementById(`total-${player}`);
  const mobileTotalElement = document.getElementById(`mobile-total-${player}`);
  
  if (totalElement) {
    totalElement.textContent = total || 0;
  }
  if (mobileTotalElement) {
    mobileTotalElement.textContent = total || 0;
  }
  
  const totalPar = holePars.reduce((sum, par) => sum + par, 0);
  if (total > 0) {
    let color, fontWeight = 'bold';
    if (total < totalPar) {
      color = '#28a745';
    } else if (total === totalPar) {
      color = '#007bff';
    } else {
      color = '#dc3545';
    }
    
    if (totalElement) {
      totalElement.style.color = color;
      totalElement.style.fontWeight = fontWeight;
    }
    if (mobileTotalElement) {
      mobileTotalElement.style.color = color;
      mobileTotalElement.style.fontWeight = fontWeight;
    }
  }
}

// SCORE PAGE - Spara rundan till Supabase (uppdaterad för att hantera både desktop och mobil)
const scoreForm = document.getElementById("score-form");
if (scoreForm) {
  renderScoreForm();

  scoreForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Sparar...";
    submitButton.disabled = true;
    
    const players = JSON.parse(localStorage.getItem("currentPlayers"));
    const onlineStatus = localStorage.getItem("isOnline") === 'true';
    
    let success = false;
    
    if (onlineStatus) {
      // Spara till Supabase - en rad per spelare
      const dataToSave = [];
      
      players.forEach(player => {
        const scores = [];
        let totalScore = 0;
        
        for (let i = 0; i < 9; i++) {
          const inputName = `${player}-hole${i}`;
          const score = parseInt(document.querySelector(`[name='${inputName}']`).value);
          scores.push(score);
          totalScore += score;
        }
        
        dataToSave.push({
          namn: player,
          hole1: scores[0],
          hole2: scores[1],
          hole3: scores[2],
          hole4: scores[3],
          hole5: scores[4],
          hole6: scores[5],
          hole7: scores[6],
          hole8: scores[7],
          hole9: scores[8],
          totalt: totalScore
        });
      });
      
      // Skicka all data till Supabase
      const result = await callSupabase('POST', '', dataToSave);
      
      if (result.success) {
        success = true;
        alert("Rundan sparad till Supabase! 🎉");
      } else {
        // Fallback till localStorage
        const rounds = JSON.parse(localStorage.getItem("rounds") || "[]");
        const newRound = { 
          date: new Date().toISOString(), 
          scores: {} 
        };
        
        players.forEach(player => {
          newRound.scores[player] = [];
          for (let i = 0; i < 9; i++) {
            const inputName = `${player}-hole${i}`;
            const val = parseInt(document.querySelector(`[name='${inputName}']`).value);
            newRound.scores[player].push(val);
          }
        });
        
        rounds.push(newRound);
        localStorage.setItem("rounds", JSON.stringify(rounds));
        success = true;
        alert("Offline: Rundan sparad lokalt! ⚠️");
      }
    } else {
      // Spara till localStorage
      const rounds = JSON.parse(localStorage.getItem("rounds") || "[]");
      const newRound = { 
        date: new Date().toISOString(), 
        scores: {} 
      };
      
      players.forEach(player => {
        newRound.scores[player] = [];
        for (let i = 0; i < 9; i++) {
          const inputName = `${player}-hole${i}`;
          const val = parseInt(document.querySelector(`[name='${inputName}']`).value);
          newRound.scores[player].push(val);
        }
      });
      
      rounds.push(newRound);
      localStorage.setItem("rounds", JSON.stringify(rounds));
      success = true;
      alert("Offline: Rundan sparad lokalt! ⚠️");
    }
    
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    
    if (success) {
      window.location.href = "scoreboard.html";
    }
  });
}

// SCOREBOARD PAGE
async function renderLeaderboard() {
  const leaderboardDiv = document.getElementById("leaderboard");
  if (!leaderboardDiv) return;
  
  leaderboardDiv.innerHTML = '<p class="loading">Laddar leaderboard...</p>';
  
  let scoreboard = {};
  
  // Försök hämta från Supabase
  const result = await callSupabase('GET', '?select=namn,totalt&order=created_at.desc');
  
  if (result.success && result.data && result.data.length > 0) {
    // Bearbeta data från Supabase
    result.data.forEach(row => {
      const player = row.namn;
      const total = parseInt(row.totalt);
      
      if (!scoreboard[player]) {
        scoreboard[player] = {
          totalScore: 0,
          bestScore: total,
          roundsPlayed: 0
        };
      }
      
      scoreboard[player].totalScore += total;
      scoreboard[player].roundsPlayed += 1;
      
      if (total < scoreboard[player].bestScore) {
        scoreboard[player].bestScore = total;
      }
    });
    
    leaderboardDiv.innerHTML = '<div class="status-message status-online">🌐 Data från Supabase</div>';
  } else {
    // Fallback till localStorage
    const rounds = JSON.parse(localStorage.getItem("rounds") || "[]");
    
    rounds.forEach(round => {
      for (const player in round.scores) {
        const score = round.scores[player].reduce((a, b) => a + b, 0);
        if (!scoreboard[player]) {
          scoreboard[player] = {
            totalScore: 0,
            bestScore: score,
            roundsPlayed: 0
          };
        }
        scoreboard[player].totalScore += score;
        scoreboard[player].roundsPlayed += 1;
        if (score < scoreboard[player].bestScore) {
          scoreboard[player].bestScore = score;
        }
      }
    });
    
    if (Object.keys(scoreboard).length > 0) {
      leaderboardDiv.innerHTML = '<div class="status-message status-offline">⚠️ Offline data (lokal lagring)</div>';
    }
  }

  if (!Object.keys(scoreboard).length) {
    leaderboardDiv.innerHTML += "<p>Inga rundor spelade än.</p>";
    return;
  }

  // Desktop table
  let desktopHtml = `<table>
    <thead>
      <tr>
        <th>Spelare</th>
        <th>Rundor</th>
        <th>Snittscore</th>
        <th>Bästa runda</th>
      </tr>
    </thead><tbody>`;

  // Mobile layout
  let mobileHtml = '<div class="mobile-leaderboard">';

  // Sortera efter bästa snittpoäng
  const sortedPlayers = Object.entries(scoreboard)
    .sort(([,a], [,b]) => (a.totalScore / a.roundsPlayed) - (b.totalScore / b.roundsPlayed));

  sortedPlayers.forEach(([player, data], index) => {
    const avgScore = (data.totalScore / data.roundsPlayed).toFixed(1);
    
    // Desktop table row
    desktopHtml += `<tr>
      <td>${player}</td>
      <td>${data.roundsPlayed}</td>
      <td>${avgScore}</td>
      <td>${data.bestScore}</td>
    </tr>`;
    
    // Mobile card
    mobileHtml += `
      <div class="mobile-player-card">
        <div class="mobile-player-header">
          <span>${player}</span>
          <div class="mobile-player-rank">${index + 1}</div>
        </div>
        <div class="mobile-stats-grid">
          <div class="mobile-stat-item">
            <div class="mobile-stat-label">Rundor</div>
            <div class="mobile-stat-value rounds">${data.roundsPlayed}</div>
          </div>
          <div class="mobile-stat-item">
            <div class="mobile-stat-label">Snittscore</div>
            <div class="mobile-stat-value avg-score">${avgScore}</div>
          </div>
          <div class="mobile-stat-item">
            <div class="mobile-stat-label">Bästa runda</div>
            <div class="mobile-stat-value best-score">${data.bestScore}</div>
          </div>
        </div>
      </div>`;
  });

  desktopHtml += `</tbody></table>`;
  mobileHtml += `</div>`;

  leaderboardDiv.innerHTML += desktopHtml + mobileHtml;
}

// Initialisera leaderboard
if (document.getElementById("leaderboard")) {
  renderLeaderboard();
}

// STATISTICS PAGE
let allStatsRows = [];

function getRoundScores(row) {
  return holePars.map((_, index) => parseInt(row[`hole${index + 1}`]) || 0);
}

function getRoundTotal(row) {
  const savedTotal = parseInt(row.totalt);
  if (!Number.isNaN(savedTotal)) return savedTotal;
  return getRoundScores(row).reduce((sum, score) => sum + score, 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderLineChart(rounds) {
  if (!rounds.length) return '';

  const totals = rounds.map(getRoundTotal);
  const width = 640;
  const height = 260;
  const padding = 34;
  const minScore = Math.min(...totals, 31);
  const maxScore = Math.max(...totals, 31);
  const range = Math.max(1, maxScore - minScore);
  const points = totals.map((total, index) => {
    const x = rounds.length === 1
      ? width / 2
      : padding + (index / (rounds.length - 1)) * (width - padding * 2);
    const y = padding + ((maxScore - total) / range) * (height - padding * 2);
    return { x, y, total };
  });
  const polyline = points.map(point => `${point.x},${point.y}`).join(' ');

  return `
    <div class="stats-chart">
      <div class="chart-heading">
        <h3>Alla rundor</h3>
        <span>Lägre är bättre</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Poäng per runda">
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="chart-axis"></line>
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="chart-axis"></line>
        <polyline points="${polyline}" class="round-line"></polyline>
        ${points.map((point, index) => `
          <g>
            <circle cx="${point.x}" cy="${point.y}" r="5" class="round-dot"></circle>
            <text x="${point.x}" y="${Math.max(14, point.y - 10)}" text-anchor="middle">${point.total}</text>
            <text x="${point.x}" y="${height - 10}" text-anchor="middle" class="round-index">${index + 1}</text>
          </g>
        `).join('')}
      </svg>
    </div>`;
}

function renderHoleChart(rounds) {
  if (!rounds.length) return '';

  const holeAverages = holePars.map((par, index) => {
    const average = rounds.reduce((sum, row) => sum + (parseInt(row[`hole${index + 1}`]) || 0), 0) / rounds.length;
    return { hole: index + 1, par, average };
  });
  const maxAverage = Math.max(...holeAverages.map(item => item.average), 1);

  return `
    <div class="stats-chart">
      <div class="chart-heading">
        <h3>Snitt per hål</h3>
        <span>Jämfört med par</span>
      </div>
      <div class="hole-bars">
        ${holeAverages.map(item => {
          const overPar = item.average - item.par;
          const width = Math.max(8, (item.average / maxAverage) * 100);
          const tone = overPar <= 0 ? 'good' : overPar < 1 ? 'even' : 'high';
          return `
            <div class="hole-bar-row">
              <div class="hole-label">Hål ${item.hole}</div>
              <div class="hole-bar-track">
                <div class="hole-bar ${tone}" style="width: ${width}%"></div>
              </div>
              <div class="hole-value">${item.average.toFixed(1)}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderPlayerStats(playerName) {
  const statsDiv = document.getElementById("player-stats");
  if (!statsDiv) return;

  const rounds = allStatsRows
    .filter(row => row.namn === playerName)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  if (!rounds.length) {
    statsDiv.innerHTML = '<p>Ingen statistik hittades för spelaren.</p>';
    return;
  }

  const totals = rounds.map(getRoundTotal);
  const roundsPlayed = rounds.length;
  const bestScore = Math.min(...totals);
  const latestScore = totals[totals.length - 1];
  const averageScore = totals.reduce((sum, total) => sum + total, 0) / roundsPlayed;
  const totalPar = holePars.reduce((sum, par) => sum + par, 0);
  const bestToPar = bestScore - totalPar;
  const bestToParText = bestToPar === 0 ? 'E' : bestToPar > 0 ? `+${bestToPar}` : String(bestToPar);

  statsDiv.innerHTML = `
    <section class="stats-summary">
      <article>
        <span>Rundor</span>
        <strong>${roundsPlayed}</strong>
      </article>
      <article>
        <span>Bästa runda</span>
        <strong>${bestScore}</strong>
        <small>${bestToParText} mot par</small>
      </article>
      <article>
        <span>Snittscore</span>
        <strong>${averageScore.toFixed(1)}</strong>
      </article>
      <article>
        <span>Senaste</span>
        <strong>${latestScore}</strong>
      </article>
    </section>
    <section class="stats-grid">
      ${renderLineChart(rounds)}
      ${renderHoleChart(rounds)}
    </section>
  `;
}

async function initStatsPage() {
  const select = document.getElementById("stats-player-select");
  const statsDiv = document.getElementById("player-stats");
  if (!select || !statsDiv) return;

  statsDiv.innerHTML = '<p class="loading">Laddar statistik</p>';

  const result = await callSupabase('GET', '?select=created_at,namn,hole1,hole2,hole3,hole4,hole5,hole6,hole7,hole8,hole9,totalt&order=created_at.asc');

  if (!result.success || !result.data || result.data.length === 0) {
    statsDiv.innerHTML = '<p>Ingen statistik hittades i Supabase.</p>';
    select.innerHTML = '<option value="">Ingen data</option>';
    return;
  }

  allStatsRows = result.data;
  const playerNames = [...new Set(allStatsRows.map(row => row.namn).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'sv'));

  select.innerHTML = playerNames
    .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
    .join('');

  const bestDefaultPlayer = playerNames.find(name => name === 'Felix') || playerNames[0];
  select.value = bestDefaultPlayer;
  renderPlayerStats(bestDefaultPlayer);

  select.addEventListener('change', () => {
    renderPlayerStats(select.value);
  });
}

if (document.getElementById("player-stats")) {
  initStatsPage();
}
