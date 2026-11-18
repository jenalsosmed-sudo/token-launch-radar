// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, the comparables the model was calibrated from, a per-protocol detail
// view with the model's own arithmetic and the farm plan, and the live-token set the multiples
// come from. No network: every byte it shows is in data.js.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;
  var app = document.getElementById('board');
  var state = { q: '', category: 'all', chain: 'all', tab: 'pre-token', sort: 'implied', dir: -1, selected: null };

  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return usd.format(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function fmtMult(n) { return (n === null || n === undefined || !isFinite(n)) ? 'n/a' : n.toFixed(2) + 'x'; }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child === null || child === undefined) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function readHash() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    var params = new URLSearchParams(hash);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('p')) state.selected = params.get('p');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('chain')) state.chain = params.get('chain');
    if (params.get('tab')) state.tab = params.get('tab');
  }
  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.chain !== 'all') params.set('chain', state.chain);
    if (state.tab !== 'pre-token') params.set('tab', state.tab);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function header() {
    return el('header', { class: 'top' },
      el('div', { class: 'brand' }, 'Token Radar', el('span', { class: 'dot', text: '.' })),
      el('div', { class: 'top-meta' },
        el('span', { text: 'Snapshot ' + DATA.as_of }),
        el('span', { text: 'DefiLlama protocol index' }),
        el('span', { text: DATA.model_version + ' model' })
      )
    );
  }

  function lede() {
    return el('div', { class: 'wrap' },
      el('section', { class: 'lede' },
        el('h1', { text: DATA.watchlist_size + ' watchlist protocols, ranked by implied value' }),
        el('p', { text: 'The watchlist is the floor: every protocol with at least $' + Math.round(DATA.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds ' + DATA.early_size + ' pre-token protocols below that floor, chosen by the model itself. Implied value is a model, not a promise — and never a prediction that a token will launch.' }),
        el('div', { class: 'facts' },
          el('div', { class: 'fact' }, el('span', { text: 'Watchlist covered' }), el('b', { text: DATA.watchlist_size + ' / ' + DATA.watchlist_size })),
          el('div', { class: 'fact' }, el('span', { text: 'Pre-token rows scored' }), el('b', { text: String(DATA.board_size) })),
          el('div', { class: 'fact' }, el('span', { text: 'Early rows below the floor' }), el('b', { text: String(DATA.early_size) })),
          el('div', { class: 'fact' }, el('span', { text: 'Live-token protocols set aside' }), el('b', { text: String(DATA.live_size) }))
        )
      ),
      controls(),
      el('div', { id: 'view' }),
      el('div', { id: 'method' }),
      foot()
    );
  }

  function method() {
    var m = DATA.model;
    var cal = DATA.calibration;
    var comps = cal.by_category.map(function (c) {
      return el('tr', null,
        el('td', { text: c.category }),
        el('td', { class: 'num', text: String(c.live_count) }),
        el('td', { class: 'num', text: c.median_ratio === null ? 'n/a' : fmtMult(c.median_ratio) }),
        el('td', { class: 'num' }, el('b', { text: fmtMult(c.multiple) }))
      );
    });
    return el('section', { class: 'method' },
      el('h2', { text: 'How the value is earned' }),
      el('p', null,
        'Implied value = TVL \u00d7 ',
        el('code', { text: 'category multiple' }),
        ' \u00d7 growth \u00d7 maturity \u00d7 breadth. The multiple is the median market-cap-over-TVL of the live protocols in the same category, blended toward the global median (',
        el('code', { text: 'global ' + fmtMult(cal.global_median) + ' over ' + cal.live_count + ' live protocols' }),
        ') with a prior weight of ' + m.prior_weight + ', then clamped to [' + m.clamp_low + ', ' + m.clamp_high + ']. Growth is the 7-day TVL change clamped to [' + m.growth_floor + '%, ' + m.growth_cap + '%] at weight ' + m.growth_weight + '; maturity rises with the square root of age up to ' + m.maturity_days + ' days; breadth adds ' + (m.breadth_step * 100) + '% per chain, up to ' + m.breadth_cap + ' chains. No protocol name is ever special-cased.'
      ),
      el('table', { class: 'comps' },
        el('thead', null, el('tr', null,
          el('th', { text: 'Category' }),
          el('th', { text: 'Live protocols' }),
          el('th', { text: 'Median mcap / TVL' }),
          el('th', { text: 'Multiple used' })
        )),
        el('tbody', null, comps)
      )
    );
  }

  function controls() {
    var categories = Array.from(new Set(DATA.rows.map(function (r) { return r.category || 'Other'; }))).sort();
    var chains = Array.from(new Set(DATA.rows.reduce(function (acc, r) { return acc.concat(r.chains || []); }, []))).sort();
    var search = el('input', { type: 'search', id: 'q', placeholder: 'Search name, category or chain', value: state.q, 'aria-label': 'Search the board' });
    search.addEventListener('input', function () { state.q = search.value; state.selected = null; writeHash(); render(); });
    var cat = el('select', { id: 'category', 'aria-label': 'Filter by category' },
      el('option', { value: 'all', text: 'All categories' }),
      categories.map(function (c) { return el('option', { value: c, text: c, selected: c === state.category ? 'selected' : null }); })
    );
    cat.addEventListener('change', function () { state.category = cat.value; state.selected = null; writeHash(); render(); });
    var chain = el('select', { id: 'chain', 'aria-label': 'Filter by chain' },
      el('option', { value: 'all', text: 'All chains' }),
      chains.map(function (c) { return el('option', { value: c, text: c, selected: c === state.chain ? 'selected' : null }); })
    );
    chain.addEventListener('change', function () { state.chain = chain.value; state.selected = null; writeHash(); render(); });
    var pre = el('button', { type: 'button', 'aria-pressed': state.tab === 'pre-token' ? 'true' : 'false', text: 'Pre-token', onclick: function () { state.tab = 'pre-token'; state.selected = null; render(); } });
    var live = el('button', { type: 'button', 'aria-pressed': state.tab === 'live' ? 'true' : 'false', text: 'Live token', onclick: function () { state.tab = 'live'; state.selected = null; render(); } });
    return el('div', { class: 'controls' },
      el('div', { class: 'field' }, el('label', { for: 'q', text: 'Search' }), search),
      el('div', { class: 'field' }, el('label', { for: 'category', text: 'Category' }), cat),
      el('div', { class: 'field' }, el('label', { for: 'chain', text: 'Chain' }), chain),
      el('div', { class: 'field' }, el('span', { class: 'sub', text: 'Token status' }), el('div', { class: 'tabs' }, pre, live)),
      el('span', { class: 'count', id: 'count' })
    );
  }

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    return DATA.rows.filter(function (r) {
      if (state.category !== 'all' && (r.category || 'Other') !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) < 0) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }
  function sortedRows(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else { av = a.implied_value_usd; bv = b.implied_value_usd; }
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function sortHeader(key, label) {
    return el('th', { scope: 'col' },
      el('button', { type: 'button', onclick: function () { if (state.sort === key) state.dir = -state.dir; else { state.sort = key; state.dir = -1; } render(); } },
        label, state.sort === key ? (state.dir === -1 ? ' \u25bc' : ' \u25b2') : ''
      )
    );
  }

  function boardTable(list) {
    var body = list.map(function (r) {
      var growth = r.change_7d === null ? el('td', { class: 'num', text: 'n/a' })
        : el('td', { class: 'num ' + (r.change_7d >= 0 ? 'up' : 'down'), text: fmtPct(r.change_7d) });
      return el('tr', { class: r.watchlist ? 'watch' : null },
        el('td', { class: 'num', text: String(r.rank) }),
        el('td', null,
          el('a', { class: 'rowlink', href: '#p=' + r.slug, onclick: function (e) { e.preventDefault(); state.selected = r.slug; writeHash(); render(); } }, r.name),
          r.watchlist ? el('span', { class: 'badge', text: 'WATCHLIST' }) : null,
          el('div', { class: 'cat', text: (r.category || 'Other') + ' \u00b7 ' + (r.chains || []).slice(0, 3).join(', ') })
        ),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        growth,
        el('td', { class: 'num', text: fmtAge(r.age_days) }),
        el('td', { class: 'num' }, el('b', { text: fmtUsd(r.implied_value_usd) }))
      );
    });
    return el('table', { class: 'board' },
      el('thead', null, el('tr', null,
        el('th', { scope: 'col', text: '#' }),
        sortHeader('name', 'Protocol'),
        sortHeader('tvl', 'TVL'),
        sortHeader('growth', '7d'),
        sortHeader('age', 'Age'),
        sortHeader('implied', 'Implied value')
      )),
      el('tbody', null, body)
    );
  }

  function liveTable() {
    var body = DATA.live.map(function (r) {
      return el('tr', null,
        el('td', null, el('b', { text: r.name }), el('div', { class: 'cat', text: (r.category || 'Other') + ' \u00b7 ' + (r.chains || []).slice(0, 3).join(', ') })),
        el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }),
        el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }),
        el('td', { class: 'num' }, el('b', { text: fmtMult(r.ratio) }))
      );
    });
    return el('div', null,
      el('p', { class: 'note', text: 'These protocols already trade. Their market caps are the market\u2019s own values — and the source of the category multiples above. They are set aside from the ranked board, never mixed into it.' }),
      el('table', { class: 'board' },
        el('thead', null, el('tr', null,
          el('th', { scope: 'col', text: 'Protocol' }),
          el('th', { scope: 'col', text: 'TVL' }),
          el('th', { scope: 'col', text: 'Market cap' }),
          el('th', { scope: 'col', text: 'Mcap / TVL' })
        )),
        el('tbody', null, body)
      )
    );
  }

  function detailView(row) {
    var m = DATA.model;
    var back = el('a', { class: 'back', href: '#', onclick: function (e) { e.preventDefault(); state.selected = null; writeHash(); render(); } }, '\u2190 Back to the board');
    var math = el('div', { class: 'math' },
      el('div', null, el('span', { text: 'TVL' }), el('b', { text: fmtUsd(row.tvl_usd) })),
      el('div', null, el('span', { text: (row.category || 'Other') + ' multiple' }), el('b', { text: fmtMult(row.multiple) })),
      el('div', null, el('span', { text: 'Growth \u00d7 maturity \u00d7 breadth' }), el('b', { text: row.growth_multiplier.toFixed(2) + ' \u00d7 ' + row.maturity_multiplier.toFixed(2) + ' \u00d7 ' + row.breadth_multiplier.toFixed(2) })),
      el('div', null, el('span', { text: 'Age' }), el('b', { text: fmtAge(row.age_days) })),
      el('div', { class: 'eq' }, el('span', { text: 'Implied value' }), el('b', { text: fmtUsd(row.implied_value_usd) }))
    );
    var steps = (row.farm_steps || []).map(function (s, i) {
      return el('li', null, el('b', { text: 'Step ' + (i + 1) + '. ' }), s);
    });
    return el('div', null, back,
      el('section', { class: 'detail' },
        el('h2', null, '#' + row.rank + ' ' + row.name, row.watchlist ? el('span', { class: 'badge', text: 'WATCHLIST' }) : null),
        el('p', { class: 'sub', text: (row.category || 'Other') + ' \u00b7 ' + (row.chains || []).join(', ') + ' \u00b7 listed ' + (row.listed_at || 'unknown') + ' \u00b7 7d ' + fmtPct(row.change_7d) }),
        math,
        el('p', { class: 'note', text: 'The arithmetic: ' + fmtUsd(row.tvl_usd) + ' \u00d7 ' + row.multiple.toFixed(2) + ' (category multiple) \u00d7 ' + row.growth_multiplier.toFixed(2) + ' (growth) \u00d7 ' + row.maturity_multiplier.toFixed(2) + ' (maturity) \u00d7 ' + row.breadth_multiplier.toFixed(2) + ' (breadth) = ' + fmtUsd(row.implied_value_usd) + '. The multiple comes from the live protocols in this category, blended toward the global median with a prior weight of ' + m.prior_weight + '.' }),
        el('h3', { text: 'Farm plan' }),
        el('ol', { class: 'plan' }, steps),
        el('p', { class: 'note', text: 'A plan is a suggestion, not a promise of a token. Never pay to claim, and never send funds to an address the protocol itself does not publish.' })
      )
    );
  }

  function foot() {
    return el('footer', { class: 'foot' },
      'Token Radar \u00b7 snapshot ' + DATA.as_of + ' \u00b7 ' + DATA.source + ' \u00b7 ' + DATA.model_version + ' model. ' +
      'Implied values are the model\u2019s own claim from the snapshot\u2019s figures; they are not a prediction that any protocol will issue a token, and no row is financial advice.'
    );
  }

  function render() {
    var view = document.getElementById('view');
    if (!view) return;
    while (view.firstChild) view.removeChild(view.firstChild);
    var count = document.getElementById('count');
    if (state.selected) {
      var row = null;
      for (var i = 0; i < DATA.rows.length; i++) if (DATA.rows[i].slug === state.selected) { row = DATA.rows[i]; break; }
      if (row) {
        view.appendChild(detailView(row));
        if (count) count.textContent = 'Detail: ' + row.name;
      } else {
        state.selected = null;
        view.appendChild(el('div', { class: 'empty', text: 'That protocol is not on this board.' }));
      }
    } else if (state.tab === 'live') {
      view.appendChild(liveTable());
      if (count) count.textContent = DATA.live.length + ' live-token protocols';
    } else {
      var list = sortedRows(filteredRows());
      if (list.length === 0) {
        view.appendChild(el('div', { class: 'empty', text: 'No rows match this filter.' }));
      } else {
        view.appendChild(boardTable(list));
      }
      if (count) count.textContent = list.length + ' rows shown';
    }
    app.setAttribute('aria-busy', 'false');
  }

  readHash();
  var shell = document.createDocumentFragment();
  shell.appendChild(header());
  shell.appendChild(lede());
  app.appendChild(shell);
  document.getElementById('method').appendChild(method());
  render();
  window.addEventListener('hashchange', function () { readHash(); render(); });
})();
