// KONFIGURERA DENNA URL MED DIN SHEETDB API URL
const SHEETDB_API_URL = 'https://sheetdb.io/api/v1/2v34wn1pngq4f';

// Hämta eller skapa spelarlista
let players = [];
let isOnline = true;

// Par för varje hål (1-9)
const holePars = [3, 4, 3, 3, 3, 3, 4, 4, 4];

// Hjälpfunktion för att göra API-anrop till SheetDB
async function callSheetDB(method, endpoint = '', data = null) {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${SHEETDB_API_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Fel vid anslutning till SheetDB:', error);
    isOnline = false;
    return { success: false, message: 'Offline mode', error: error.message };
  }
}

// Ladda spelare från SheetDB
async function loadPlayers() {
  // Försök hämta unika spelare från SheetDB
  const result = await callSheetDB('GET');
  
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
    offlineWarning.innerHTML = '<p style="color: orange;">⚠️ Offline läge - data sparas lokalt</p>';
    list.appendChild(offlineWarning);
  }
  
  players.forEach((player, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
      <label>
        <input type="checkbox" name="player" value="${player}"/>
        ${player}
      </label>
    `;
    list.appendChild(div);
  });
}

async function addPlayer() {
  const input = document.getElementById("new-player");
  const name = input.value.trim();
  if (name && !players.includes(name)) {
    players.push(name);
    
    if (isOnline) {
      // Lägg till spelare i SheetDB (kommer att sparas automatiskt när de spelar)
      // Men uppdatera listan direkt
      // Inget behov av att skicka till separat players endpoint
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
    html += '<div class="status-message status-online">🌐 Online - data sparas till SheetDB</div>';
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

// SCORE PAGE - Spara rundan till SheetDB (uppdaterad för att hantera både desktop och mobil)
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
      // Spara till SheetDB - en rad per spelare
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
      
      // Skicka all data till SheetDB
      const result = await callSheetDB('POST', '', dataToSave);
      
      if (result.success) {
        success = true;
        alert("Rundan sparad till SheetDB! 🎉");
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
  
  leaderboardDiv.innerHTML = '<p>Laddar leaderboard...</p>';
  
  let scoreboard = {};
  
  // Försök hämta från SheetDB
  const result = await callSheetDB('GET');
  
  if (result.success && result.data && result.data.length > 0) {
    // Bearbeta data från SheetDB
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
    
    leaderboardDiv.innerHTML = '<div class="status-message status-online">🌐 Data från SheetDB</div>';
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

  let html = `<table>
    <thead>
      <tr>
        <th>Spelare</th>
        <th>Rundor</th>
        <th>Snittscore</th>
        <th>Bästa runda</th>
      </tr>
    </thead><tbody>`;

  // Sortera efter bästa snittpoäng
  const sortedPlayers = Object.entries(scoreboard)
    .sort(([,a], [,b]) => (a.totalScore / a.roundsPlayed) - (b.totalScore / b.roundsPlayed));

  sortedPlayers.forEach(([player, data]) => {
    const avgScore = (data.totalScore / data.roundsPlayed).toFixed(1);
    html += `<tr>
      <td>${player}</td>
      <td>${data.roundsPlayed}</td>
      <td>${avgScore}</td>
      <td>${data.bestScore}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  leaderboardDiv.innerHTML += html;
}

// Initialisera leaderboard
if (document.getElementById("leaderboard")) {
  renderLeaderboard();
}