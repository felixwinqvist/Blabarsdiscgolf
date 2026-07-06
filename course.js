const courseHoles = [
  { hole: 1, par: 3, length: 45, tee: [57.652554, 16.649332], basket: [57.652725, 16.649981] },
  { hole: 2, par: 4, length: 110, tee: [57.652759, 16.649879], basket: [57.653772, 16.649405] },
  { hole: 3, par: 3, length: 38, tee: [57.654013, 16.649032], basket: [57.654178, 16.649582] },
  { hole: 4, par: 3, length: 65, tee: [57.654871, 16.651130], basket: [57.654398, 16.651753] },
  { hole: 5, par: 3, length: 77, tee: [57.654571, 16.651165], basket: [57.654599, 16.652522] },
  { hole: 6, par: 3, length: 40, tee: [57.654542, 16.652649], basket: [57.654266, 16.652777] },
  { hole: 7, par: 4, length: 140, tee: [57.654341, 16.653188], basket: [57.654743, 16.651283] },
  { hole: 8, par: 4, length: 95, tee: [57.654540, 16.649829], basket: [57.653834, 16.648895] },
  { hole: 9, par: 4, length: 150, tee: [57.653877, 16.648944], basket: [57.652549, 16.649250] }
];

document.addEventListener('DOMContentLoaded', initCourseMap);

function initCourseMap() {
  const mapElement = document.getElementById('course-map');
  if (!mapElement || !window.L) return;

  const map = L.map('course-map', {
    zoomControl: false,
    attributionControl: true
  }).setView([57.653710, 16.651041], 17);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
  }).addTo(map);

  const routeLayer = L.layerGroup().addTo(map);
  const revealButton = document.getElementById('reveal-course');
  const status = document.getElementById('course-route-status');
  const holeList = document.getElementById('hole-map-list');
  const mapCard = document.querySelector('.course-map-card');
  const holeLayers = new Map();
  let courseVisible = false;
  let courseAnimating = false;
  let selectedHole = null;

  function createHoleIcon(hole, type) {
    return L.divIcon({
      className: `hole-map-marker ${type}`,
      html: `<span>${hole}</span>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  }

  function renderHoleList() {
    holeList.innerHTML = courseHoles.map((item) => `
      <button class="hole-map-item" type="button" data-hole="${item.hole}">
        <span>Hål ${item.hole}</span>
        <strong>Par ${item.par}</strong>
        <small>${item.length} m</small>
      </button>
    `).join('');

    holeList.querySelectorAll('.hole-map-item').forEach((button) => {
      button.addEventListener('click', () => {
        const hole = courseHoles.find((item) => item.hole === Number(button.dataset.hole));
        if (!hole) return;

        if (!courseVisible) {
          revealCourse(hole.hole);
          return;
        }

        highlightHole(hole.hole, true);
      });
    });
  }

  function addHoleToMap(hole) {
    const outline = L.polyline([hole.tee, hole.basket], {
      color: '#102033',
      weight: 7,
      opacity: 0.72,
      lineCap: 'round',
      className: 'course-line course-line-outline'
    }).addTo(routeLayer);

    const line = L.polyline([hole.tee, hole.basket], {
      color: '#ffffff',
      weight: 3,
      opacity: 0.92,
      lineCap: 'round',
      className: 'course-line course-line-main'
    }).addTo(routeLayer);

    const teeMarker = L.marker(hole.tee, { icon: createHoleIcon(hole.hole, 'tee') })
      .bindPopup(`Hål ${hole.hole} - utkast`)
      .addTo(routeLayer);

    const basketMarker = L.marker(hole.basket, { icon: createHoleIcon(hole.hole, 'basket') })
      .bindPopup(`Hål ${hole.hole} - korg, par ${hole.par}`)
      .addTo(routeLayer);

    animatePolyline(outline, 760);
    animatePolyline(line, 760);

    [outline, line, teeMarker, basketMarker].forEach((layer) => {
      layer.on('click', () => highlightHole(hole.hole, true));
    });

    holeLayers.set(hole.hole, { outline, line, teeMarker, basketMarker });
    setTimeout(() => {
      teeMarker.getElement()?.classList.add('is-visible');
      basketMarker.getElement()?.classList.add('is-visible');
    }, 220);
  }

  function animatePolyline(polyline, duration) {
    const path = polyline.getElement();
    if (!path) return;

    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${duration}ms cubic-bezier(.16, 1, .3, 1)`;
    path.style.strokeDashoffset = '0';

    setTimeout(() => {
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
    }, duration + 80);
  }

  function clearLineAnimation(polyline) {
    const path = polyline.getElement();
    if (!path) return;

    path.style.transition = '';
    path.style.strokeDasharray = '';
    path.style.strokeDashoffset = '';
  }

  function resetHoleStyles() {
    holeLayers.forEach((layers) => {
      layers.outline.setStyle({ color: '#102033', weight: 7, opacity: 0.72 });
      layers.line.setStyle({ color: '#ffffff', weight: 3, opacity: 0.92 });
      layers.teeMarker.getElement()?.classList.remove('is-active');
      layers.basketMarker.getElement()?.classList.remove('is-active');
    });

    holeList.querySelectorAll('.hole-map-item').forEach((button) => {
      button.classList.remove('is-active');
    });
  }

  function highlightHole(holeNumber, shouldZoom = false) {
    const hole = courseHoles.find((item) => item.hole === Number(holeNumber));
    const layers = holeLayers.get(Number(holeNumber));
    if (!hole || !layers) return;

    selectedHole = Number(holeNumber);
    resetHoleStyles();
    clearLineAnimation(layers.outline);
    clearLineAnimation(layers.line);

    layers.outline.setStyle({ color: '#063f4a', weight: 10, opacity: 0.9 });
    layers.line.setStyle({ color: '#5ff6d2', weight: 5, opacity: 1 });
    layers.outline.bringToFront();
    layers.line.bringToFront();
    layers.teeMarker.getElement()?.classList.add('is-active');
    layers.basketMarker.getElement()?.classList.add('is-active');

    const button = holeList.querySelector(`[data-hole="${holeNumber}"]`);
    button?.classList.add('is-active');
    button?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    status.innerHTML = `
      <span>Markerat hål ${hole.hole}</span>
      <strong>Par ${hole.par} · ${hole.length} m</strong>
    `;

    if (shouldZoom) {
      map.fitBounds([hole.tee, hole.basket], { padding: [90, 90], maxZoom: 19 });
    }
  }

  function revealCourse(focusHole = null) {
    if (courseVisible || courseAnimating) {
      if (focusHole) {
        if (holeLayers.has(Number(focusHole))) {
          highlightHole(focusHole, true);
        } else {
          selectedHole = Number(focusHole);
        }
      }
      return;
    }

    courseAnimating = true;
    courseVisible = true;
    routeLayer.clearLayers();
    holeLayers.clear();

    const bounds = [];
    courseHoles.forEach((hole) => {
      bounds.push(hole.tee, hole.basket);
    });

    map.fitBounds(bounds, { padding: [40, 40] });
    revealButton.textContent = 'Ritar bana...';
    revealButton.disabled = true;
    status.innerHTML = '<span>Animation</span><strong>Ritar in hål 1-9</strong>';
    mapCard?.classList.add('is-revealed');

    courseHoles.forEach((hole, index) => {
      setTimeout(() => {
        addHoleToMap(hole);

        const button = holeList.querySelector(`[data-hole="${hole.hole}"]`);
        button?.classList.add('is-loaded');

        if (selectedHole === hole.hole) {
          highlightHole(hole.hole, true);
        }

        if (index === courseHoles.length - 1) {
          courseAnimating = false;
          revealButton.textContent = 'Banan visas';
          status.innerHTML = '<span>Status</span><strong>Banan visas på kartan</strong>';

          if (focusHole) {
            setTimeout(() => highlightHole(focusHole, true), 120);
          }
        }
      }, index * 260);
    });
  }

  revealButton.addEventListener('click', revealCourse);
  map.on('click', revealCourse);
  renderHoleList();

  requestAnimationFrame(() => map.invalidateSize());
  [150, 500, 1000].forEach((delay) => {
    setTimeout(() => map.invalidateSize(), delay);
  });

  window.addEventListener('resize', () => map.invalidateSize());
}
