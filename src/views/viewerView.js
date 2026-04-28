import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { BUILDINGS_CONFIG } from '../config/buildings.js';
import { buildCardResource, normalizeModelDefinition } from '../lib/cloudResolver.js';

function encodeHtml(raw) {
  return String(raw || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isSupportedModel(modelUrl) {
  const lowered = modelUrl.toLowerCase();
  return lowered.endsWith('.glb') || lowered.endsWith('.gltf') || lowered.endsWith('.obj');
}

function getModelKind(modelUrl) {
  const cleanUrl = String(modelUrl || '').split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.glb') || cleanUrl.endsWith('.gltf')) return 'gltf';
  if (cleanUrl.endsWith('.obj')) return 'obj';
  return 'unknown';
}

function buildMtlUrl(modelUrl, explicitMtlUrl) {
  if (explicitMtlUrl) return explicitMtlUrl;
  return String(modelUrl || '').replace(/\.obj(\?.*)?$/i, '.mtl$1');
}

function resolveModelBundle(building) {
  const bundle = building.modelBundle || {};
  const modelDefinition = normalizeModelDefinition(building.model);
  const modelUrl = bundle.obj || modelDefinition.obj || modelDefinition.url || '';
  const mtlUrl = bundle.mtl || modelDefinition.mtl || building.mtl || '';
  const texturePath = bundle.texturePath || modelDefinition.texturePath || '';
  return {
    modelUrl,
    mtlUrl,
    texturePath,
    kind: getModelKind(modelUrl)
  };
}

export function renderViewerView(container, { id, onBack }) {
  const mapped = BUILDINGS_CONFIG.map(buildCardResource);
  const building = mapped.find((item) => item.id === id);
  if (!building) {
    container.innerHTML = `
      <main class="viewer-root">
        <div class="error-panel">未找到建筑 ID：${encodeHtml(id)}，请返回列表重新选择。</div>
        <div class="viewer-top">
          <button class="viewer-back" data-act="back">返回列表</button>
        </div>
      </main>
    `;
    container.querySelector('[data-act="back"]')?.addEventListener('click', onBack);
    return () => {
      container.innerHTML = '';
    };
  }

  container.innerHTML = `
    <main class="viewer-root">
      <canvas class="viewer-canvas" id="viewer-canvas"></canvas>

      <div class="viewer-top">
        <button class="viewer-back" data-act="back">返回</button>
        <div class="viewer-badges">
          <button class="viewer-desc-btn" data-act="toggle-desc">介绍</button>
        </div>
      </div>

      <div class="viewer-controls" data-el="viewer-controls">
        <label style="display:inline-flex;gap:8px;align-items:center">
          <input type="checkbox" data-el="fullbright" checked /> 全亮（无光照）
        </label>
        <div style="display:inline-flex;gap:8px;align-items:center;margin-left:12px">
          <label style="font-size:12px">方位</label>
          <input type="range" min="-180" max="180" value="44" data-el="light-azimuth" />
          <input type="number" data-el="light-azimuth-num" value="44" style="width:56px" />
        </div>
        <div style="display:inline-flex;gap:8px;align-items:center;margin-left:6px">
          <label style="font-size:12px">仰俯</label>
          <input type="range" min="-90" max="90" value="60" data-el="light-elevation" />
          <input type="number" data-el="light-elevation-num" value="60" style="width:56px" />
        </div>
        <label style="display:inline-flex;gap:8px;align-items:center;margin-left:12px">
          背景色
          <input type="color" value="#aca9a9" data-el="bg-color" style="margin-left:6px" />
        </label>
      </div>

      <aside class="desc-panel hidden" data-el="desc-panel">${encodeHtml(building.description || building.info || '暂无介绍')}</aside>

      <section class="viewer-info">
        <div class="info-panel hidden" data-el="author-panel">${encodeHtml(building.info || '暂无信息')}</div>
        <div class="author-pill" data-act="toggle-author">改造者：${encodeHtml(building.author || '未知')}</div>
      </section>

      <div class="loading-mask" data-el="loading-mask">
        <div class="loading-box">
          <div>正在加载：${encodeHtml(building.title)}</div>
          <div style="margin-top:8px" data-el="progress-text">0%</div>
          <div class="loading-bar"><div class="loading-fill" data-el="progress-fill" style="width:0%"></div></div>
        </div>
      </div>

      <div class="error-panel hidden" data-el="error-panel"></div>
    </main>
  `;

  let showAuthorInfo = false;
  let showDescInfo = false;
  let progress = 0;
  let loading = true;
  let error = '';

  let disposeRenderer = () => {};
  const modelBundle = resolveModelBundle(building);

  const backButton = container.querySelector('[data-act="back"]');
  const descToggleButton = container.querySelector('[data-act="toggle-desc"]');
  const authorToggleButton = container.querySelector('[data-act="toggle-author"]');
  const descPanel = container.querySelector('[data-el="desc-panel"]');
  const authorPanel = container.querySelector('[data-el="author-panel"]');
  const loadingMask = container.querySelector('[data-el="loading-mask"]');
  const progressText = container.querySelector('[data-el="progress-text"]');
  const progressFill = container.querySelector('[data-el="progress-fill"]');
  const errorPanel = container.querySelector('[data-el="error-panel"]');

  function syncUi() {
    descPanel?.classList.toggle('hidden', !showDescInfo);
    authorPanel?.classList.toggle('hidden', !showAuthorInfo);
    loadingMask?.classList.toggle('hidden', !loading);
    if (progressText) progressText.textContent = `${progress}%`;
    if (progressFill) progressFill.style.width = `${progress}%`;

    if (!error) {
      errorPanel?.classList.add('hidden');
      if (errorPanel) errorPanel.textContent = '';
      return;
    }

    if (errorPanel) {
      errorPanel.textContent = error;
      errorPanel.classList.remove('hidden');
    }
  }

  function bootThree() {
    if (!modelBundle.modelUrl) {
      loading = false;
      error = '当前建筑缺少模型地址，请检查配置后重试。';
      syncUi();
      return;
    }

    if (!isSupportedModel(modelBundle.modelUrl)) {
      loading = false;
      error = `不支持的模型格式: ${modelBundle.modelUrl}（仅支持 .glb/.gltf/.obj）`;
      syncUi();
      return;
    }

    const canvas = container.querySelector('#viewer-canvas');
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#09121d');

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
    camera.position.set(0, 24, 70);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    let hemi = new THREE.HemisphereLight(0xb5e6ff, 0x11213a, 1.2);
    scene.add(hemi);

    // Directional light controllable by UI
    let dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(44, 60, 34);
    dir.castShadow = true;
    scene.add(dir);

    const grid = new THREE.GridHelper(280, 20, 0x1f7ea8, 0x154053);
    grid.position.y = -0.1;
    scene.add(grid);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    loader.setDRACOLoader(draco);
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();

    let model = null;
    let originalMaterials = new Map();
    let pendingFullbright = true; // default to fullbright

    const onProgress = (evt) => {
      if (evt.total > 0) {
        progress = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
        syncUi();
      }
    };

    const onError = (err) => {
      loading = false;
      error = `模型加载失败：${(err && err.message) || '未知错误'}`;
      syncUi();
    };

    const onModelLoaded = (loadedModel) => {
      model = loadedModel;
      scene.add(model);

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const diagonal = Math.max(size.length(), 1);

      model.position.sub(center);
      controls.target.set(0, 0, 0);
      camera.near = Math.max(diagonal / 200, 0.01);
      camera.far = diagonal * 15;
      camera.position.set(diagonal * 0.8, diagonal * 0.42, diagonal * 0.8);
      camera.updateProjectionMatrix();
      controls.update();

      loading = false;
      progress = 100;
      syncUi();

      // If user requested fullbright before model loaded, apply now
      if (pendingFullbright) {
        applyFullbright(true);
      }
    };

    function applyFullbright(enable) {
      if (!model) return;
      model.traverse((node) => {
        if (!node.isMesh) return;
        if (enable) {
          // store original
          if (!originalMaterials.has(node.uuid)) {
            originalMaterials.set(node.uuid, node.material);
          }
          const mats = node.material;
          if (Array.isArray(mats)) {
            node.material = mats.map((m) => {
              const mb = new THREE.MeshBasicMaterial({
                map: m.map || null,
                color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
                skinning: m.skinning || false
              });
              return mb;
            });
          } else {
            node.material = new THREE.MeshBasicMaterial({
              map: mats.map || null,
              color: mats.color ? mats.color.clone() : new THREE.Color(0xffffff),
              skinning: mats.skinning || false
            });
          }
        } else {
          const orig = originalMaterials.get(node.uuid);
          if (orig) {
            node.material = orig;
            originalMaterials.delete(node.uuid);
          }
        }
      });
      // Toggle lights visibility when fullbright is enabled
      if (dir) dir.visible = !enable;
      if (hemi) hemi.visible = !enable;
    }

    const kind = modelBundle.kind;

    if (kind === 'gltf') {
      loader.load(
        modelBundle.modelUrl,
        (gltf) => onModelLoaded(gltf.scene),
        onProgress,
        onError
      );
    } else if (kind === 'obj') {
      const mtlUrl = buildMtlUrl(modelBundle.modelUrl, modelBundle.mtlUrl);
      const objDirectory = modelBundle.modelUrl.slice(0, modelBundle.modelUrl.lastIndexOf('/') + 1);
      const objFileName = modelBundle.modelUrl.split('/').pop() || '';
      const objRelativePath = objFileName || modelBundle.modelUrl;

      // Determine material/texture directory. Accept either a directory or a single-file texture path.
      let materialDirectory = '';
      if (modelBundle.texturePath) {
        materialDirectory = modelBundle.texturePath;
        // If texturePath points to an image file, convert to its containing directory.
        if (/\.(png|jpg|jpeg|webp|bmp|tga|gif)(\?.*)?$/i.test(materialDirectory)) {
          const idx = materialDirectory.lastIndexOf('/');
          if (idx !== -1) materialDirectory = materialDirectory.slice(0, idx + 1);
        }
      } else if (mtlUrl) {
        materialDirectory = mtlUrl.slice(0, mtlUrl.lastIndexOf('/') + 1);
      } else {
        materialDirectory = objDirectory;
      }

      mtlLoader.setPath(objDirectory);
      mtlLoader.setResourcePath(materialDirectory);
      objLoader.setPath(objDirectory);

      const finalMtlUrl = mtlUrl || `${objFileName?.replace(/\.obj$/i, '.mtl') || ''}`;

      // Try fetching and parsing the MTL file explicitly so we can ensure texture base path.
      // This avoids cases where texture paths in the MTL are relative and the loader cannot resolve them.
      fetch(finalMtlUrl)
        .then((resp) => {
          if (!resp.ok) throw new Error('MTL fetch failed');
          return resp.text();
        })
        .then((mtlText) => {
          const materials = mtlLoader.parse(mtlText, materialDirectory);
          materials.preload();
          objLoader.setMaterials(materials);
          objLoader.load(objRelativePath, onModelLoaded, onProgress, onError);
        })
        .catch(() => {
          // Fallback: try the loader's normal load flow; if that fails, still attempt OBJ alone.
          mtlLoader.load(
            finalMtlUrl,
            (materials) => {
              materials.preload();
              materials.setTexturePath?.(materialDirectory);
              objLoader.setMaterials(materials);
              objLoader.load(objRelativePath, onModelLoaded, onProgress, onError);
            },
            undefined,
            () => {
              objLoader.load(objRelativePath, onModelLoaded, onProgress, onError);
            }
          );
        });
    } else {
      onError(new Error('未知模型格式'));
    }

    // --- Wire UI controls ---
    const controlsRoot = container.querySelector('[data-el="viewer-controls"]');
    const fullbrightEl = controlsRoot?.querySelector('[data-el="fullbright"]');
    const azEl = controlsRoot?.querySelector('[data-el="light-azimuth"]');
    const azNum = controlsRoot?.querySelector('[data-el="light-azimuth-num"]');
    const elEl = controlsRoot?.querySelector('[data-el="light-elevation"]');
    const elNum = controlsRoot?.querySelector('[data-el="light-elevation-num"]');
    const bgEl = controlsRoot?.querySelector('[data-el="bg-color"]');

    const deg2rad = (d) => (d * Math.PI) / 180;

    function updateDirFromUi() {
      const az = azEl ? Number(azEl.value) : 44;
      const elv = elEl ? Number(elEl.value) : 60;
      // sync numeric displays
      if (azNum) azNum.value = az;
      if (elNum) elNum.value = elv;
      const r = 100;
      const azR = deg2rad(az);
      const elR = deg2rad(elv);
      const x = r * Math.cos(elR) * Math.cos(azR);
      const y = r * Math.sin(elR);
      const z = r * Math.cos(elR) * Math.sin(azR);
      if (dir) dir.position.set(x, y, z);
      if (dir) dir.lookAt(0, 0, 0);
    }

    function onFullbrightChange() {
      const enabled = !!(fullbrightEl && fullbrightEl.checked);
      if (!model) {
        pendingFullbright = enabled;
      } else {
        applyFullbright(enabled);
      }
    }

    function onBgChange() {
      const color = (bgEl && bgEl.value) || '#ffffff';
      scene.background = new THREE.Color(color);
    }

    // sync number -> range
    azNum?.addEventListener('change', () => {
      if (azEl && azNum) {
        azEl.value = String(Number(azNum.value) || 0);
        updateDirFromUi();
      }
    });
    elNum?.addEventListener('change', () => {
      if (elEl && elNum) {
        elEl.value = String(Number(elNum.value) || 0);
        updateDirFromUi();
      }
    });

    azEl?.addEventListener('input', updateDirFromUi);
    elEl?.addEventListener('input', updateDirFromUi);
    fullbrightEl?.addEventListener('change', onFullbrightChange);
    bgEl?.addEventListener('input', onBgChange);

    // initialize
    // ensure fullbright control reflects default
    if (fullbrightEl) fullbrightEl.checked = true;
    updateDirFromUi();
    onBgChange();
    // attempt to apply immediately if model already exists
    if (pendingFullbright && model) applyFullbright(true);

    let rafId = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(tick);
    };
    tick();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    disposeRenderer = () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      draco.dispose();
      // remove UI listeners
      try {
        const controlsRoot = container.querySelector('[data-el="viewer-controls"]');
        const fullbrightEl = controlsRoot?.querySelector('[data-el="fullbright"]');
        const azEl = controlsRoot?.querySelector('[data-el="light-azimuth"]');
        const elEl = controlsRoot?.querySelector('[data-el="light-elevation"]');
        const bgEl = controlsRoot?.querySelector('[data-el="bg-color"]');
        azEl?.removeEventListener('input', updateDirFromUi);
        elEl?.removeEventListener('input', updateDirFromUi);
        fullbrightEl?.removeEventListener('change', onFullbrightChange);
        bgEl?.removeEventListener('input', onBgChange);
      } catch (e) {
        // ignore
      }
      if (model) {
        model.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) {
            node.material.forEach((mtl) => mtl?.dispose?.());
          } else {
            node.material?.dispose?.();
          }
        });
      }
      renderer.dispose();
    };
  }

  backButton?.addEventListener('click', onBack);
  authorToggleButton?.addEventListener('click', () => {
    showAuthorInfo = !showAuthorInfo;
    syncUi();
  });
  descToggleButton?.addEventListener('click', () => {
    showDescInfo = !showDescInfo;
    syncUi();
  });

  syncUi();
  bootThree();

  return () => {
    disposeRenderer();
    container.innerHTML = '';
  };
}
