// Full team name -> abbreviation for logo lookup
// BB:COMMON:TEAM_LOGOS_START
const TEAM_LOGOS = {
  "Arizona Cardinals": "ARI",
  "Atlanta Falcons": "ATL",
  "Baltimore Ravens": "BAL",
  "Buffalo Bills": "BUF",
  "Carolina Panthers": "CAR",
  "Chicago Bears": "CHI",
  "Cincinnati Bengals": "CIN",
  "Cleveland Browns": "CLE",
  "Dallas Cowboys": "DAL",
  "Denver Broncos": "DEN",
  "Detroit Lions": "DET",
  "Green Bay Packers": "GB",
  "Houston Texans": "HOU",
  "Indianapolis Colts": "IND",
  "Jacksonville Jaguars": "JAX",
  "Kansas City Chiefs": "KC",
  "Las Vegas Raiders": "LVR",
  "Los Angeles Chargers": "LAC",
  "Los Angeles Rams": "LAR",
  "Miami Dolphins": "MIA",
  "Minnesota Vikings": "MIN",
  "New England Patriots": "NE",
  "New Orleans Saints": "NO",
  "New York Giants": "NYG",
  "New York Jets": "NYJ",
  "Philadelphia Eagles": "PHI",
  "Pittsburgh Steelers": "PIT",
  "San Francisco 49ers": "SF",
  "Seattle Seahawks": "SEA",
  "Tampa Bay Buccaneers": "TB",
  "Tennessee Titans": "TEN",
  "Washington Commanders": "WAS"
};
// BB:COMMON:TEAM_LOGOS_END
// === Shared helper: full team name -> 3‑letter abbr (prefer TEAM_LOGOS) ===
// BB:COMMON:ABBR_HELPERS_START
window.teamAbbr = function teamAbbr(name) {
  if (!name) return '';
  if (window.TEAM_LOGOS && window.TEAM_LOGOS[name]) return window.TEAM_LOGOS[name];
  // fallback: first 3 letters, letters only
  return String(name).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
};
// BB:COMMON:ABBR_HELPERS_END

// Switchable logo resolver. Local now; later we can flip to a CDN.
// assets/common.js

// Map full team names → ESPN logo URLs
const TEAM_LOGOS_ESPN = {
  "Arizona Cardinals": "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png",
  "Atlanta Falcons": "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png",
  "Baltimore Ravens": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
  "Buffalo Bills": "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
  "Carolina Panthers": "https://a.espncdn.com/i/teamlogos/nfl/500/car.png",
  "Chicago Bears": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
  "Cincinnati Bengals": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png",
  "Cleveland Browns": "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png",
  "Dallas Cowboys": "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png",
  "Denver Broncos": "https://a.espncdn.com/i/teamlogos/nfl/500/den.png",
  "Detroit Lions": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
  "Green Bay Packers": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
  "Houston Texans": "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png",
  "Indianapolis Colts": "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png",
  "Jacksonville Jaguars": "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png",
  "Kansas City Chiefs": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
  "Las Vegas Raiders": "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png",
  "Los Angeles Chargers": "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png",
  "Los Angeles Rams": "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png",
  "Miami Dolphins": "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png",
  "Minnesota Vikings": "https://a.espncdn.com/i/teamlogos/nfl/500/min.png",
  "New England Patriots": "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png",
  "New Orleans Saints": "https://a.espncdn.com/i/teamlogos/nfl/500/no.png",
  "New York Giants": "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png",
  "New York Jets": "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png",
  "Philadelphia Eagles": "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png",
  "Pittsburgh Steelers": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
  "San Francisco 49ers": "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png",
  "Seattle Seahawks": "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png",
  "Tampa Bay Buccaneers": "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png",
  "Tennessee Titans": "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png",
  "Washington Commanders": "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png"
};

// Replace your old PNG lookup with this
function getLogoUrl(teamName) {
  return TEAM_LOGOS_ESPN[teamName] || null;
}
function slugTeam(n){return n.replace(/[^A-Za-z]/g,'').toUpperCase().slice(0,3)}
function makeLogoSpan(t){const s=document.createElement('span');s.className='team-logo';s.textContent=slugTeam(t);return s}
function makeTeamCell(teamName) {
  const url = getLogoUrl(teamName);

  const div = document.createElement('div');
  div.className = 'team-cell';

  if (url) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = teamName;
    img.onerror = () => { img.style.display = 'none'; };
    div.appendChild(img);
  }

  const span = document.createElement('span');
  span.textContent = teamName;
  div.appendChild(span);

  return div;
}
function makeTeamLogoOnly(teamName) {
  const url = getLogoUrl(teamName);
  const img = document.createElement('img');
  if (url) {
    img.src = url;
    img.alt = teamName;
    img.style.width = '24px';
    img.style.height = '24px';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '50%';
    img.style.background = '#fff';
    img.onerror = () => { img.style.display = 'none'; };
  }
  return img;
}
// BB:COMMON:UI_UTILS_START
function confValuesForGames(n){const m=16,a=[];for(let v=m;v>=1;v--)a.push(v);while(a.length>n)a.pop();return a}function showToast(m){const t=document.querySelector('.toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',2200)}
// BB:COMMON:UI_UTILS_END
