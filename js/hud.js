// DOM HUD. Stat bars, tower picker, briefing modal, finale modal.
// Game calls into update*() methods each frame; modals fire on demand.

import { TOWER_DEFS, TOWER_ORDER } from './towers.js';

export class HUD {
  constructor() {
    this.stabEl    = document.querySelector('#stat-stability .stat__v');
    this.stabRoot  = document.querySelector('#stat-stability');
    this.energyEl  = document.querySelector('#stat-energy .stat__v');
    this.energyRoot= document.querySelector('#stat-energy');
    this.researchEl= document.querySelector('#stat-research .stat__v');
    this.waveEl    = document.querySelector('#stat-wave .stat__v');
    this.picker    = document.getElementById('tower-picker');
    this.brief     = document.getElementById('brief');
    this.briefT    = document.getElementById('brief-title');
    this.briefD    = document.getElementById('brief-desc');
    this.briefGo   = document.getElementById('brief-go');
    this.finale    = document.getElementById('finale');
    this.finaleEy  = document.getElementById('finale-eyebrow');
    this.finaleT   = document.getElementById('finale-title');
    this.finaleS   = document.getElementById('finale-sub');
    this.finaleSt  = document.getElementById('finale-stats');
    this.finaleR   = document.getElementById('finale-restart');
    this.tt        = document.getElementById('tt');

    this._renderPicker();
  }

  _renderPicker() {
    this.picker.innerHTML = TOWER_ORDER.map((kind) => {
      const d = TOWER_DEFS[kind];
      return `
        <button class="tw" data-kind="${kind}" style="--tc:${d.color}"
          aria-pressed="false"
          data-tt-name="${d.name}"
          data-tt-role="${d.role}"
          data-tt-stem="${d.stem}">
          ${this._iconFor(kind, d.color)}
          <div class="tw__name">${d.name}</div>
          <div class="tw__cost">${d.cost} <b>RP</b></div>
        </button>
      `;
    }).join('');
  }

  _iconFor(kind, color) {
    if (kind === 'SOLAR_ARRAY') {
      return `<svg class="tw__icon" viewBox="0 0 24 24" fill="none">
        <path d="M3 12h2M19 12h2M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="4" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>
      </svg>`;
    }
    if (kind === 'UV_STERILISER') {
      return `<svg class="tw__icon" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="3" width="6" height="14" rx="1" stroke="${color}" stroke-width="2" fill="${color}" fill-opacity="0.25"/>
        <path d="M12 17v4" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        <path d="M5 21h14" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
    }
    if (kind === 'MAGNETIC_EMITTER') {
      return `<svg class="tw__icon" viewBox="0 0 24 24" fill="none">
        <ellipse cx="12" cy="12" rx="9" ry="4" stroke="${color}" stroke-width="2"/>
        <ellipse cx="12" cy="12" rx="4" ry="9" stroke="${color}" stroke-width="2"/>
        <circle cx="12" cy="12" r="2" fill="${color}"/>
      </svg>`;
    }
    return '';
  }

  bindTowerPick(handler) {
    this.picker.querySelectorAll('.tw').forEach((btn) => {
      btn.addEventListener('click', () => handler(btn.dataset.kind, btn));
      // Tooltip
      btn.addEventListener('mouseenter', (e) => this._showTip(e, btn));
      btn.addEventListener('mouseleave', () => this._hideTip());
      btn.addEventListener('mousemove',  (e) => this._moveTip(e));
    });
  }

  setSelected(kind) {
    this.picker.querySelectorAll('.tw').forEach((b) =>
      b.setAttribute('aria-pressed', b.dataset.kind === kind ? 'true' : 'false'),
    );
  }

  setAffordable(researchPoints) {
    this.picker.querySelectorAll('.tw').forEach((b) => {
      const d = TOWER_DEFS[b.dataset.kind];
      b.disabled = d.cost > researchPoints;
    });
  }

  // ─── Stat bars ───
  setStability(v) {
    const n = Math.max(0, Math.round(v));
    this.stabEl.textContent = n;
    this.stabRoot.classList.toggle('warn',   n > 0  && n < 50);
    this.stabRoot.classList.toggle('danger', n <= 25);
  }
  setEnergy(v) {
    const n = Math.max(0, Math.round(v));
    this.energyEl.textContent = n;
    this.energyRoot.classList.toggle('empty', n <= 0);
  }
  setResearch(v) {
    this.researchEl.textContent = Math.round(v);
    this.setAffordable(v);
  }
  setWave(curr, total) {
    this.waveEl.textContent = `${curr} / ${total}`;
  }

  // ─── Briefing modal ───
  showBrief(title, desc) {
    this.briefT.textContent = title;
    this.briefD.textContent = desc;
    this.brief.hidden = false;
    return new Promise((resolve) => {
      const handler = () => {
        this.brief.hidden = true;
        this.briefGo.removeEventListener('click', handler);
        resolve();
      };
      this.briefGo.addEventListener('click', handler);
    });
  }

  // ─── Finale modal ───
  showFinale(won, statsObj, restartCb) {
    this.finale.style.setProperty('--fc', won ? '#4ade80' : '#ef4444');
    this.finaleEy.textContent = won ? 'MISSION COMPLETE' : 'GREENHOUSE LOST';
    this.finaleT.textContent  = won ? 'BREAKTHROUGH' : 'COLLAPSE';
    this.finaleS.textContent  = won
      ? 'You held the line. Research points carry forward to the next mission (coming soon).'
      : 'The greenhouse stability hit zero. Restart and rebalance your defence.';
    this.finaleSt.innerHTML = Object.entries(statsObj).map(([k, v]) =>
      `<li>${k}<b>${v}</b></li>`).join('');
    this.finale.hidden = false;
    const handler = () => {
      this.finale.hidden = true;
      this.finaleR.removeEventListener('click', handler);
      restartCb();
    };
    this.finaleR.addEventListener('click', handler);
  }

  // ─── Tooltips ───
  _showTip(ev, el) {
    this.tt.style.setProperty('--tc', el.style.getPropertyValue('--tc'));
    this.tt.innerHTML = `
      <h4>${el.dataset.ttName}</h4>
      <p>${el.dataset.ttRole}</p>
      <div class="stem">STEM · ${el.dataset.ttStem}</div>
    `;
    this.tt.classList.add('show');
    this._moveTip(ev);
  }
  _moveTip(ev) {
    const x = (ev.clientX ?? 0) + 16;
    const y = (ev.clientY ?? 0) + 16;
    this.tt.style.left = `${x}px`;
    this.tt.style.top  = `${y}px`;
  }
  _hideTip() {
    this.tt.classList.remove('show');
  }
}
