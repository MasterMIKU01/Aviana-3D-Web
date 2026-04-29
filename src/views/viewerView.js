import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { BUILDINGS_CONFIG } from '../config/buildings.js';
import { FOUNDATIONS_CONFIG } from '../config/foundations.js';
import { buildCardResource, normalizeModelDefinition } from '../lib/modelResolver.js';

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

function getModelKindLabel(kind) {
  if (kind === 'gltf') return 'GLTF / GLB';
  if (kind === 'obj') return 'OBJ';
  return '未知格式';
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
        <div class="viewer-mini-card">
          <div class="viewer-mini-title">${encodeHtml(building.title)}</div>
          <div class="viewer-mini-actions">
            <button class="viewer-back" data-act="back">返回</button>
            <button class="viewer-desc-btn" data-act="show-intro">介绍</button>
          </div>
          <div class="viewer-intro-panel hidden" data-el="intro-panel">${encodeHtml(building.description || building.info || '暂无介绍')}</div>
        </div>
      </div>

      <aside class="viewer-dock" data-el="viewer-controls">
        <!-- controls only, meta moved to top-left mini card -->
        <details class="viewer-foldout">
          <summary>光源调整</summary>
          <div class="viewer-foldout-body">
            <label class="viewer-toggle-line">
              <input type="checkbox" data-el="fullbright" checked />
              <span>全亮（无光照）</span>
            </label>
            <label class="viewer-toggle-line">
              <input type="checkbox" data-el="light-helper" />
              <span>显示光源示意</span>
            </label>
            <div class="viewer-slider-row">
              <label>方位</label>
              <div class="viewer-slider-controls">
                <input type="range" min="-180" max="180" value="44" data-el="light-azimuth" />
                <input type="number" data-el="light-azimuth-num" value="44" />
              </div>
            </div>
            <div class="viewer-slider-row">
              <label>仰俯</label>
              <div class="viewer-slider-controls">
                <input type="range" min="-90" max="90" value="60" data-el="light-elevation" />
                <input type="number" data-el="light-elevation-num" value="60" />
              </div>
            </div>
          </div>
        </details>

        <details class="viewer-foldout">
          <summary>模型控制</summary>
          <div class="viewer-foldout-body">
            <div class="viewer-translate-title" style="font-size:12px; color:rgba(234,248,255,0.8); margin-bottom:8px;">位置平移</div>
            <div class="viewer-translate-grid">
              <button type="button" class="viewer-translate-btn viewer-translate-btn--up" data-act="move-model" data-axis="y" data-dir="1">上</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--front" data-act="move-model" data-axis="z" data-dir="1">前</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--left" data-act="move-model" data-axis="x" data-dir="-1">左</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--reset" data-act="reset-model">复位</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--right" data-act="move-model" data-axis="x" data-dir="1">右</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--back" data-act="move-model" data-axis="z" data-dir="-1">后</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--down" data-act="move-model" data-axis="y" data-dir="-1">下</button>
            </div>
            <div class="viewer-translate-hint" style="margin-bottom:12px;">点击可按步长平移模型，便于微调构图。</div>
            
            <div class="viewer-translate-title" style="font-size:12px; color:rgba(234,248,255,0.8); margin-bottom:8px;">角度旋转</div>
            <div class="viewer-translate-grid">
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="x" data-dir="1">X轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="y" data-dir="1">Y轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="z" data-dir="1">Z轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="x" data-dir="-1">X轴 -90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="y" data-dir="-1">Y轴 -90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-model" data-axis="z" data-dir="-1">Z轴 -90°</button>
            </div>
            
            <label class="viewer-toggle-line" style="margin-top:16px; border-top:1px solid rgba(148,226,255,0.16); padding-top:12px;">
              <input type="checkbox" data-el="auto-rotate" />
              <span>开启自动旋转展示</span>
            </label>
          </div>
        </details>

        <details class="viewer-foldout">
          <summary>背景调整</summary>
          <div class="viewer-foldout-body">
            <div class="viewer-bg-row">
              <label for="viewer-bg-color">背景色</label>
              <input id="viewer-bg-color" type="color" value="#aca9a9" data-el="bg-color" />
            </div>

            <label class="viewer-toggle-line" style="margin-top:12px;">
              <input type="checkbox" data-el="toggle-grid" checked />
              <span>显示参考线</span>
            </label>

            <div class="viewer-translate-title" style="font-size:12px; color:rgba(234,248,255,0.8); margin-top:16px; margin-bottom:8px; border-top:1px solid rgba(148,226,255,0.16); padding-top:12px;">地基模型背景</div>
            <label class="viewer-toggle-line">
              <input type="checkbox" data-el="toggle-foundation" />
              <span>启用地基背景</span>
            </label>
            <div class="viewer-bg-row" style="margin-top:8px;">
              <label>选择地基</label>
              <select data-el="foundation-select" style="background: rgba(3,78,114,0.9); color: #eaf8ff; border: 1px solid rgba(148,226,255,0.14); border-radius: 4px; padding: 4px; flex:1; margin-left:8px;">
                ${FOUNDATIONS_CONFIG.map(f => `<option value="${encodeHtml(f.id)}">${encodeHtml(f.title)}</option>`).join('')}
              </select>
            </div>

            <div class="viewer-translate-title" style="font-size:12px; color:rgba(234,248,255,0.8); margin-top:12px; margin-bottom:8px;">地基角度旋转</div>
            <div class="viewer-translate-grid">
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="x" data-dir="1">X轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="y" data-dir="1">Y轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="z" data-dir="1">Z轴 +90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="x" data-dir="-1">X轴 -90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="y" data-dir="-1">Y轴 -90°</button>
              <button type="button" class="viewer-translate-btn" data-act="rotate-foundation" data-axis="z" data-dir="-1">Z轴 -90°</button>
            </div>

            <div class="viewer-translate-title" style="font-size:12px; color:rgba(234,248,255,0.8); margin-top:12px; margin-bottom:8px;">地基尺寸与位置偏移</div>

            <div class="viewer-slider-row" style="margin-bottom:12px;">
              <label>缩放比例</label>
              <div class="viewer-slider-controls">
                <input type="range" min="0.1" max="100" step="0.1" value="1" data-el="foundation-scale" />
                <input type="number" data-el="foundation-scale-num" value="1" step="0.1" />
              </div>
            </div>

            <div class="viewer-translate-grid">
              <button type="button" class="viewer-translate-btn viewer-translate-btn--up" data-act="move-foundation" data-axis="y" data-dir="1">上</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--front" data-act="move-foundation" data-axis="z" data-dir="1">前</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--left" data-act="move-foundation" data-axis="x" data-dir="-1">左</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--reset" data-act="reset-foundation">复位</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--right" data-act="move-foundation" data-axis="x" data-dir="1">右</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--back" data-act="move-foundation" data-axis="z" data-dir="-1">后</button>
              <button type="button" class="viewer-translate-btn viewer-translate-btn--down" data-act="move-foundation" data-axis="y" data-dir="-1">下</button>
            </div>
          </div>
        </details>
      </aside>

      <div class="loading-mask" data-el="loading-mask">
        <div class="loading-box">
          <div>正在加载：${encodeHtml(building.title)}</div>
          <div style="margin-top:8px" data-el="progress-text">0%</div>
          <div class="loading-bar"><div class="loading-fill" data-el="progress-fill" style="width:0%"></div></div>
        </div>
      </div>

      <div class="error-panel hidden" data-el="error-panel"></div>
    </main>
    <div class="viewer-author-panel hidden" data-el="author-panel">
      <div class="viewer-author-content">
        <p>${encodeHtml(building.info || '暂无改造者信息')}</p>
      </div>
    </div>

    <button class="viewer-author-cta" data-act="show-author">改造者：${encodeHtml(building.author || '未知')}</button>
  `;

  let progress = 0;
  let loading = true;
  let error = '';

  let disposeRenderer = () => {};
  const modelBundle = resolveModelBundle(building);

  const backButton = container.querySelector('[data-act="back"]');
  const introBtn = container.querySelector('[data-act="show-intro"]');
  const introPanel = container.querySelector('[data-el="intro-panel"]');
  const authorCta = container.querySelector('[data-act="show-author"]');
  const authorPanel = container.querySelector('[data-el="author-panel"]');
  const loadingMask = container.querySelector('[data-el="loading-mask"]');
  const progressText = container.querySelector('[data-el="progress-text"]');
  const progressFill = container.querySelector('[data-el="progress-fill"]');
  const errorPanel = container.querySelector('[data-el="error-panel"]');

  function syncUi() {
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

    const lightHelper = new THREE.DirectionalLightHelper(dir, 8, 0x7ddcff);
    lightHelper.visible = false;
    scene.add(lightHelper);

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
    let modelRoot = null;
    let originalMaterials = new Map();
    let pendingFullbright = true; // default to fullbright
    let showLightHelper = false;
    const translateStep = 2.5;

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
      modelRoot = new THREE.Group();
      scene.add(modelRoot);
      modelRoot.add(model);

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
      lightHelper.update();

      loading = false;
      progress = 100;
      syncUi();

      // If user requested fullbright before model loaded, apply now
      if (pendingFullbright) {
        applyFullbright(true);
      }
    };

    function applyFullbright(enable) {
      const targetNodes = [];
      if (model) targetNodes.push(model);
      if (currentFoundationModel) targetNodes.push(currentFoundationModel);

      targetNodes.forEach(rootNode => {
        rootNode.traverse((node) => {
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
    const lightHelperEl = controlsRoot?.querySelector('[data-el="light-helper"]');
    const azEl = controlsRoot?.querySelector('[data-el="light-azimuth"]');
    const azNum = controlsRoot?.querySelector('[data-el="light-azimuth-num"]');
    const elEl = controlsRoot?.querySelector('[data-el="light-elevation"]');
    const elNum = controlsRoot?.querySelector('[data-el="light-elevation-num"]');
    const bgEl = controlsRoot?.querySelector('[data-el="bg-color"]');
    const toggleGridEl = controlsRoot?.querySelector('[data-el="toggle-grid"]');
    const moveButtons = controlsRoot?.querySelectorAll('[data-act="move-model"]');
    const rotateButtons = controlsRoot?.querySelectorAll('[data-act="rotate-model"]');
    const autoRotateEl = controlsRoot?.querySelector('[data-el="auto-rotate"]');
    const resetButton = controlsRoot?.querySelector('[data-act="reset-model"]');

    const toggleFoundationEl = controlsRoot?.querySelector('[data-el="toggle-foundation"]');
    const foundationSelectEl = controlsRoot?.querySelector('[data-el="foundation-select"]');
    const foundationScaleEl = controlsRoot?.querySelector('[data-el="foundation-scale"]');
    const foundationScaleNum = controlsRoot?.querySelector('[data-el="foundation-scale-num"]');
    const foundationMoveBtns = controlsRoot?.querySelectorAll('[data-act="move-foundation"]');
    const foundationRotateBtns = controlsRoot?.querySelectorAll('[data-act="rotate-foundation"]');
    const foundationResetBtn = controlsRoot?.querySelector('[data-act="reset-foundation"]');

    let foundationRoot = new THREE.Group();
    foundationRoot.position.y = -0.2; // Slightly below grid (-0.1)
    foundationRoot.visible = false;
    scene.add(foundationRoot);
    let currentFoundationModel = null;
    let currentFoundationUrl = '';

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

    function onGridChange() {
      if (grid && toggleGridEl) {
        grid.visible = toggleGridEl.checked;
      }
    }

    function applyModelTranslation(axis, direction) {
      if (!modelRoot) return;
      if (axis === 'x') modelRoot.position.x += translateStep * direction;
      if (axis === 'y') modelRoot.position.y += translateStep * direction;
      if (axis === 'z') modelRoot.position.z += translateStep * direction;
    }

    function applyModelRotation(axis, direction) {
      if (!modelRoot) return;
      const deg90 = Math.PI / 2;
      if (axis === 'x') modelRoot.rotation.x += deg90 * direction;
      if (axis === 'y') modelRoot.rotation.y += deg90 * direction;
      if (axis === 'z') modelRoot.rotation.z += deg90 * direction;
    }

    function resetModelTranslation() {
      if (!modelRoot) return;
      modelRoot.position.set(0, 0, 0);
      modelRoot.rotation.set(0, 0, 0);
    }

    function applyFoundationTranslation(axis, direction) {
      if (axis === 'x') foundationRoot.position.x += translateStep * direction;
      if (axis === 'y') foundationRoot.position.y += translateStep * direction;
      if (axis === 'z') foundationRoot.position.z += translateStep * direction;
    }

    function applyFoundationRotation(axis, direction) {
      if (!foundationRoot) return;
      const deg90 = Math.PI / 2;
      if (axis === 'x') foundationRoot.rotation.x += deg90 * direction;
      if (axis === 'y') foundationRoot.rotation.y += deg90 * direction;
      if (axis === 'z') foundationRoot.rotation.z += deg90 * direction;
    }

    function resetFoundationTranslation() {
      foundationRoot.position.set(0, -0.2, 0); // Put it back just below the grid
      foundationRoot.rotation.set(0, 0, 0);
      foundationRoot.scale.set(1, 1, 1);
      if (foundationScaleEl) foundationScaleEl.value = '1';
      if (foundationScaleNum) foundationScaleNum.value = '1';
    }

    function applyFoundationScale() {
      if (!foundationRoot) return;
      let s = foundationScaleEl ? parseFloat(foundationScaleEl.value) : 1;
      if (isNaN(s) || s <= 0) s = 1;
      if (foundationScaleNum) foundationScaleNum.value = s;
      foundationRoot.scale.set(s, s, s);
    }

    function syncFoundation() {
      const isEnabled = !!(toggleFoundationEl && toggleFoundationEl.checked);
      foundationRoot.visible = isEnabled;
      if (!isEnabled) return;

      const targetId = foundationSelectEl ? foundationSelectEl.value : '';
      if (!targetId) return;

      if (currentFoundationUrl === targetId && currentFoundationModel) {
        return; // Already loaded
      }

      currentFoundationUrl = targetId;

      // Extract loading logic for reuse
      const loadObjFoundation = (bundle, onSuccess) => {
        const fObjLoader = new OBJLoader();
        const fMtlLoader = new MTLLoader();
        
        const mtlUrl = buildMtlUrl(bundle.modelUrl, bundle.mtlUrl);
        const objDirectory = bundle.modelUrl.slice(0, bundle.modelUrl.lastIndexOf('/') + 1);
        const objFileName = bundle.modelUrl.split('/').pop() || '';
        const objRelativePath = objFileName || bundle.modelUrl;

        let materialDirectory = '';
        if (bundle.texturePath) {
          materialDirectory = bundle.texturePath;
          if (/\.(png|jpg|jpeg|webp|bmp|tga|gif)(\?.*)?$/i.test(materialDirectory)) {
            const idx = materialDirectory.lastIndexOf('/');
            if (idx !== -1) materialDirectory = materialDirectory.slice(0, idx + 1);
          }
        } else if (mtlUrl) {
          materialDirectory = mtlUrl.slice(0, mtlUrl.lastIndexOf('/') + 1);
        } else {
          materialDirectory = objDirectory;
        }

        fMtlLoader.setPath(objDirectory);
        fMtlLoader.setResourcePath(materialDirectory);
        fObjLoader.setPath(objDirectory);

        const finalMtlUrl = mtlUrl || `${objFileName?.replace(/\.obj$/i, '.mtl') || ''}`;

        fetch(finalMtlUrl)
          .then((resp) => {
            if (!resp.ok) throw new Error('MTL fetch failed');
            return resp.text();
          })
          .then((mtlText) => {
            const materials = fMtlLoader.parse(mtlText, materialDirectory);
            materials.preload();
            fObjLoader.setMaterials(materials);
            fObjLoader.load(objRelativePath, onSuccess, undefined, (e) => console.error("Foundation OBJ error", e));
          })
          .catch(() => {
            fMtlLoader.load(
              finalMtlUrl,
              (materials) => {
                materials.preload();
                materials.setTexturePath?.(materialDirectory);
                fObjLoader.setMaterials(materials);
                fObjLoader.load(objRelativePath, onSuccess, undefined, (e) => console.error("Foundation OBJ error", e));
              },
              undefined,
              () => fObjLoader.load(objRelativePath, onSuccess, undefined, (e) => console.error("Foundation OBJ error", e))
            );
          });
      };

      // Remove old foundation
      if (currentFoundationModel) {
        foundationRoot.remove(currentFoundationModel);
        currentFoundationModel.traverse((node) => {
          if (!node.isMesh) return;
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) {
            node.material.forEach((mtl) => mtl?.dispose?.());
          } else {
            node.material?.dispose?.();
          }
        });
        currentFoundationModel = null;
      }

      // Find the foundation config
      const foundationDef = FOUNDATIONS_CONFIG.find(f => f.id === targetId);
      if (!foundationDef) return;

      const fBundle = resolveModelBundle({ model: foundationDef.model });

      const onFoundationLoaded = (loadedObj) => {
        if (currentFoundationUrl !== targetId) return; // race condition check
        currentFoundationModel = loadedObj.scene || loadedObj; // Handle GLTF scene or OBJ group
        foundationRoot.add(currentFoundationModel);
        
        // If fullbright is currently enabled for the main model, apply it to the new foundation too
        const isFullbrightEnabled = !!(fullbrightEl && fullbrightEl.checked);
        if (isFullbrightEnabled || pendingFullbright) {
          applyFullbright(true);
        }
      };

      // Load new foundation
      if (fBundle.kind === 'gltf') {
        loader.load(fBundle.modelUrl, onFoundationLoaded, undefined, (e) => console.error("Foundation GLTF error", e));
      } else if (fBundle.kind === 'obj') {
        loadObjFoundation(fBundle, onFoundationLoaded);
      }
    }

    function onLightHelperChange() {
      showLightHelper = !!(lightHelperEl && lightHelperEl.checked);
      lightHelper.visible = showLightHelper;
      lightHelper.update();
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
    lightHelperEl?.addEventListener('change', onLightHelperChange);
    bgEl?.addEventListener('input', onBgChange);

    moveButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        const axis = button.getAttribute('data-axis');
        const direction = Number(button.getAttribute('data-dir') || '0');
        applyModelTranslation(axis, direction);
      });
    });

    rotateButtons?.forEach((button) => {
      button.addEventListener('click', () => {
        const axis = button.getAttribute('data-axis');
        const direction = Number(button.getAttribute('data-dir') || '0');
        applyModelRotation(axis, direction);
      });
    });

    autoRotateEl?.addEventListener('change', () => {
      if (controls) {
        controls.autoRotate = !!autoRotateEl.checked;
        controls.autoRotateSpeed = 2.0;
      }
    });

    resetButton?.addEventListener('click', resetModelTranslation);

    toggleFoundationEl?.addEventListener('change', syncFoundation);
    foundationSelectEl?.addEventListener('change', () => {
      // Force change
      currentFoundationUrl = '';
      syncFoundation();
    });

    foundationScaleNum?.addEventListener('change', () => {
      if (foundationScaleEl && foundationScaleNum) {
        foundationScaleEl.value = String(Number(foundationScaleNum.value) || 1);
        applyFoundationScale();
      }
    });
    foundationScaleEl?.addEventListener('input', applyFoundationScale);

    foundationMoveBtns?.forEach((button) => {
      button.addEventListener('click', () => {
        const axis = button.getAttribute('data-axis');
        const direction = Number(button.getAttribute('data-dir') || '0');
        applyFoundationTranslation(axis, direction);
      });
    });

    foundationRotateBtns?.forEach((button) => {
      button.addEventListener('click', () => {
        const axis = button.getAttribute('data-axis');
        const direction = Number(button.getAttribute('data-dir') || '0');
        applyFoundationRotation(axis, direction);
      });
    });

    foundationResetBtn?.addEventListener('click', resetFoundationTranslation);

    // initialize
    // ensure fullbright control reflects default
    if (fullbrightEl) fullbrightEl.checked = true;
    if (lightHelperEl) lightHelperEl.checked = false;
    updateDirFromUi();
    onBgChange();
    onLightHelperChange();
    // attempt to apply immediately if model already exists
    if (pendingFullbright && model) applyFullbright(true);

    let rafId = 0;
    const tick = () => {
      controls.update();
      if (lightHelper.visible) lightHelper.update();
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
        const introBtn = container.querySelector('[data-act="show-intro"]');
        const authorCta = container.querySelector('[data-act="show-author"]');
        const introPanel = container.querySelector('[data-el="intro-panel"]');
        const authorPanel = container.querySelector('[data-el="author-panel"]');
        introBtn?.removeEventListener('click', () => {
          if (!introPanel) return;
          introPanel.classList.toggle('hidden');
        });
        authorCta?.removeEventListener('click', () => {
          if (!authorPanel) return;
          authorPanel.classList.toggle('hidden');
        });
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
      lightHelper.dispose?.();
      renderer.dispose();
    };
  }

  backButton?.addEventListener('click', onBack);

  // intro toggle
  introBtn?.addEventListener('click', () => {
    if (!introPanel) return;
    introPanel.classList.toggle('hidden');
  });

  // author CTA (bottom-right) show info
  authorCta?.addEventListener('click', () => {
    if (!authorPanel) return;
    authorPanel.classList.toggle('hidden');
  });

  syncUi();
  bootThree();

  return () => {
    disposeRenderer();
    container.innerHTML = '';
  };
}
