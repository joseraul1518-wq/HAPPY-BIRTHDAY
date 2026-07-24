/* ==========================================================================
   ESTADO GLOBAL DE LA APLICACIÓN
   ========================================================================== */
const STATE = {
  isMusicPlaying: false,
  candlesLit: true,
  audioContext: null,
  analyser: null,
  currentPage: 1,
  celebrationInterval: null
};

let scene, camera, renderer, cakeGroup, balloonsGroup, particlesGroup;
const flames = [];
const flameLights = [];
let musicBtn, bgMusic;

window.addEventListener('DOMContentLoaded', () => {
  musicBtn = document.getElementById('music-toggle');
  bgMusic = document.getElementById('bg-music');

  initMusicControl();
  runIntroSequence();
});

function runIntroSequence() {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', transitionToScene2);
  }

  const tl = gsap.timeline();
  tl.to('#intro-text-1', { opacity: 1, y: 0, duration: 1.5, delay: 0.3 })
    .to('#intro-text-1', { opacity: 0, y: -10, duration: 1, delay: 1.8 })
    .set('#intro-text-1', { display: 'none' })
    .to('#intro-text-2', { opacity: 1, y: 0, duration: 1.5 })
    .to('#intro-text-2', { opacity: 0, y: -10, duration: 1, delay: 1.8 })
    .set('#intro-text-2', { display: 'none' })
    .to('#intro-text-3', { opacity: 1, y: 0, duration: 1.5 })
    .to(startBtn, { 
      display: 'inline-block', 
      opacity: 1, 
      y: 0, 
      duration: 1, 
      delay: 0.5,
      onComplete: () => { if (startBtn) startBtn.style.pointerEvents = 'auto'; }
    });
}

function initMusicControl() {
  if (!musicBtn || !bgMusic) return;
  musicBtn.addEventListener('click', () => {
    const musicIcon = document.getElementById('music-icon');
    if (STATE.isMusicPlaying) {
      bgMusic.pause();
      STATE.isMusicPlaying = false;
      if (musicIcon) musicIcon.textContent = '🔇';
    } else {
      bgMusic.play().catch(() => {});
      STATE.isMusicPlaying = true;
      if (musicIcon) musicIcon.textContent = '🎵';
    }
  });
}

function transitionToScene2() {
  if (bgMusic) {
    bgMusic.play().then(() => {
      STATE.isMusicPlaying = true;
      const musicIcon = document.getElementById('music-icon');
      if (musicIcon) musicIcon.textContent = '🎵';
    }).catch(() => {});
  }

  if (musicBtn) musicBtn.classList.remove('hidden');

  const introScene = document.getElementById('scene-intro');
  const cardScene = document.getElementById('scene-card');

  gsap.to(introScene, {
    opacity: 0,
    duration: 0.8,
    onComplete: () => {
      if (introScene) {
        introScene.classList.remove('active');
        introScene.style.display = 'none';
      }
      if (cardScene) {
        cardScene.classList.remove('hidden');
        cardScene.classList.add('active');
        cardScene.style.display = 'block';
        gsap.to(cardScene, { opacity: 1, duration: 0.8 });
      }
      initThreeJS();
      bindCardInteractions();
    }
  });
}

function bindCardInteractions() {
  const cover = document.getElementById('page-cover');
  if (cover) {
    cover.onclick = () => {
      if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
      if (balloonsGroup) {
        balloonsGroup.visible = true;
        gsap.fromTo(balloonsGroup.position, { y: -10 }, { y: 0, duration: 2, ease: "power2.out" });
      }
      gsap.to(cover, {
        rotateY: -180,
        opacity: 0,
        duration: 1,
        ease: "power2.inOut",
        onComplete: () => {
          cover.style.display = 'none';
          nextPage(1);
        }
      });
    };
  }

  document.querySelectorAll('[data-next-page], .next-page-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-next-page');
      nextPage(target ? parseInt(target, 10) : 2);
    };
  });

  const revealBtn = document.getElementById('reveal-cake-btn');
  if (revealBtn) {
    revealBtn.onclick = (e) => {
      e.preventDefault();
      const wrapper = document.getElementById('card-wrapper');
      if (wrapper) {
        gsap.to(wrapper, {
          opacity: 0,
          scale: 0.8,
          duration: 0.8,
          onComplete: () => {
            wrapper.style.display = 'none';
            build3DCakeProcedure();
          }
        });
      } else {
        build3DCakeProcedure();
      }
    };
  }
}

function nextPage(pageNumber) {
  STATE.currentPage = pageNumber;
  document.querySelectorAll('.card-page').forEach(p => {
    if (p.id !== 'page-cover') p.classList.add('hidden');
  });

  const targetPage = document.getElementById(`page-${pageNumber}`);
  if (targetPage) {
    targetPage.classList.remove('hidden');
    gsap.fromTo(targetPage, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 });
  }
}

function initThreeJS() {
  const container = document.getElementById('webgl-container');
  if (!container || container.children.length > 0) return;

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050505, 0.015);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 22);
  camera.lookAt(0, 2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  setupLighting();

  cakeGroup = new THREE.Group();
  balloonsGroup = new THREE.Group();
  particlesGroup = new THREE.Group();
  balloonsGroup.visible = false;

  scene.add(cakeGroup);
  scene.add(balloonsGroup);
  scene.add(particlesGroup);

  createFloatingParticles();
  createBalloons();

  window.addEventListener('resize', onWindowResize);
  setupCameraOrbit();
  animate();
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xfffdd0, 0.6);
  scene.add(ambientLight);
  const mainLight = new THREE.DirectionalLight(0xffebd7, 1.2);
  mainLight.position.set(10, 20, 15);
  scene.add(mainLight);
}

function build3DCakeProcedure() {
  const paperMat = new THREE.MeshStandardMaterial({ color: 0xFFFDD0, roughness: 0.8 });
  const icingMat = new THREE.MeshStandardMaterial({ color: 0xFADADD, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xE6CA65, metalness: 0.8, roughness: 0.3 });

  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 0.4, 64), goldMat);
  baseMesh.position.y = -2;
  baseMesh.scale.set(0, 0, 0);
  cakeGroup.add(baseMesh);

  const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 2.2, 64), paperMat);
  tier1.position.y = -0.7;
  tier1.scale.set(0, 0, 0);
  cakeGroup.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 1.8, 64), paperMat);
  tier2.position.y = 1.3;
  tier2.scale.set(0, 0, 0);
  cakeGroup.add(tier2);

  const tier3 = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 1.5, 64), icingMat);
  tier3.position.y = 2.95;
  tier3.scale.set(0, 0, 0);
  cakeGroup.add(tier3);

  const tl = gsap.timeline({ onComplete: addDecorationsAndCandles });
  tl.to(baseMesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.7)" })
    .to(tier1.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.5)" }, "-=0.2")
    .to(tier2.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.5)" }, "-=0.2")
    .to(tier3.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "back.out(1.5)" }, "-=0.2");
}

function addDecorationsAndCandles() {
  const positions = [{ x: -0.8, z: -0.8 }, { x: 0.8, z: -0.8 }, { x: -0.8, z: 0.8 }, { x: 0.8, z: 0.8 }];
  positions.forEach((pos) => createCandle(pos.x, 3.7, pos.z));

  const controls = document.getElementById('candle-controls');
  if (controls) controls.classList.remove('hidden');

  const blowBtn = document.getElementById('blow-btn');
  if (blowBtn) blowBtn.onclick = extinguishCandles;

  initMicrophone();
}

function createCandle(x, y, z) {
  const candleGroup = new THREE.Group();
  candleGroup.position.set(x, y, z);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0xFFFFFF }));
  candleGroup.add(body);

  const flameGeo = new THREE.SphereGeometry(0.18, 16, 16);
  flameGeo.scale(1, 2, 1);
  const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xFFAA00 }));
  flame.position.y = 0.95;
  candleGroup.add(flame);
  flames.push(flame);

  const flameLight = new THREE.PointLight(0xFFAA00, 1.2, 4);
  flameLight.position.y = 1.0;
  candleGroup.add(flameLight);
  flameLights.push(flameLight);

  cakeGroup.add(candleGroup);
}

function createBalloons() {
  const balloonGeo = new THREE.SphereGeometry(0.8, 32, 32);
  balloonGeo.scale(1, 1.25, 1);
  const colors = [0xFADADD, 0xE6E6FA, 0xFFFDD0, 0xE6CA65];

  for (let i = 0; i < 15; i++) {
    const balloon = new THREE.Mesh(balloonGeo, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], roughness: 0.3 }));
    balloon.position.set((Math.random() - 0.5) * 18, Math.random() * 12 - 4, (Math.random() - 0.5) * 12 - 4);
    balloon.userData = { factor: Math.random() * Math.PI };
    balloonsGroup.add(balloon);
  }
}

function createFloatingParticles() {
  const count = 150;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 25;
    positions[i + 1] = Math.random() * 15 - 3;
    positions[i + 2] = (Math.random() - 0.5) * 25;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pSystem = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xFFD700, size: 0.1, transparent: true, opacity: 0.8 }));
  particlesGroup.add(pSystem);
}

function initMicrophone() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      STATE.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      STATE.analyser = STATE.audioContext.createAnalyser();
      const source = STATE.audioContext.createMediaStreamSource(stream);
      source.connect(STATE.analyser);
      STATE.analyser.fftSize = 256;
      checkBlowIntensity();
    })
    .catch(() => {});
}

function checkBlowIntensity() {
  if (!STATE.candlesLit || !STATE.analyser) return;
  const dataArray = new Uint8Array(STATE.analyser.frequencyBinCount);
  STATE.analyser.getByteFrequencyData(dataArray);

  let sum = dataArray.reduce((a, b) => a + b, 0);
  let average = sum / dataArray.length;

  if (average > 50) {
    extinguishCandles();
  } else {
    requestAnimationFrame(checkBlowIntensity);
  }
}

function extinguishCandles() {
  if (!STATE.candlesLit) return;
  STATE.candlesLit = false;

  flames.forEach(flame => gsap.to(flame.scale, { x: 0, y: 0, z: 0, duration: 0.4 }));
  flameLights.forEach(light => gsap.to(light, { intensity: 0, duration: 0.4 }));

  const controls = document.getElementById('candle-controls');
  if (controls) controls.classList.add('hidden');

  if (typeof confetti === 'function') {
    confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
  }

  setTimeout(triggerGrandCelebration, 800);
}

function triggerGrandCelebration() {
  if (typeof gsap !== 'undefined' && camera) {
    gsap.to(camera.position, { z: 26, y: 10, duration: 2.5, ease: "power2.out" });
  }
  const modal = document.getElementById('final-modal');
  const videoContainer = document.getElementById('surprise-video-container');
  
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';

    if (videoContainer) {
      videoContainer.classList.remove('hidden');
      videoContainer.style.display = 'grid';
      videoContainer.style.opacity = '1';
    }
    
    const videos = modal.querySelectorAll('.surprise-video');
    videos.forEach(v => {
      v.currentTime = 0;
      v.play().catch(err => console.log("Error al reproducir video:", err));
    });

    startContinuousCelebrationEffects();
    
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        if (videoContainer) videoContainer.classList.add('hidden');
        videos.forEach(v => v.pause());
        if (STATE.celebrationInterval) clearInterval(STATE.celebrationInterval);
        document.querySelectorAll('.floating-celebration-item').forEach(el => el.remove());
        
        // AQUÍ SE ACTIVA EL VIDEO FINAL DE CIERRE
        showFinalVideoScreen();
      };
    }
  }
}

function showFinalVideoScreen() {
  const videoScreen = document.getElementById('final-video-screen');
  const closingVideo = document.getElementById('closing-video');
  
  if (videoScreen && closingVideo) {
    videoScreen.style.display = 'flex';
    videoScreen.classList.remove('hidden');
    
    closingVideo.currentTime = 0;
    closingVideo.play().catch(err => console.log("Error al reproducir el video final:", err));
    
    const closeFinalBtn = document.getElementById('close-final-video-btn');
    if (closeFinalBtn) {
      closeFinalBtn.onclick = () => {
        closingVideo.pause();
        videoScreen.style.display = 'none';
        videoScreen.classList.add('hidden');
        location.reload();
      };
    }
  }
}

function startContinuousCelebrationEffects() {
  if (STATE.celebrationInterval) {
    clearInterval(STATE.celebrationInterval);
  }

  const spawnParticle = () => {
    const container = document.body;
    const item = document.createElement('div');
    item.className = 'floating-celebration-item';
    
    const isHeart = Math.random() > 0.4;
    item.innerHTML = isHeart ? '❤️' : '✨';
    
    const startX = Math.random() * window.innerWidth;
    const size = Math.random() * 20 + 15;
    const duration = Math.random() * 3 + 2;

    item.style.position = 'fixed';
    item.style.left = `${startX}px`;
    item.style.top = `-40px`;
    item.style.fontSize = `${size}px`;
    item.style.zIndex = '999999';
    item.style.pointerEvents = 'none';
    item.style.transition = `transform ${duration}s linear, opacity ${duration}s ease-in`;

    container.appendChild(item);

    setTimeout(() => {
      item.style.transform = `translateY(${window.innerHeight + 80}px) rotate(${Math.random() * 360}deg)`;
      item.style.opacity = '0.2';
    }, 50);

    setTimeout(() => {
      item.remove();
    }, duration * 1000);
  };

  STATE.celebrationInterval = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      spawnParticle();
    }
  }, 300);
}

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function setupCameraOrbit() {
  const dom = renderer.domElement;
  const startDrag = (x, y) => { isDragging = true; previousMousePosition = { x, y }; };
  const moveDrag = (x, y) => {
    if (!isDragging) return;
    const deltaX = x - previousMousePosition.x;
    if (cakeGroup) cakeGroup.rotation.y += deltaX * 0.005;
    previousMousePosition = { x, y };
  };
  const stopDrag = () => { isDragging = false; };

  dom.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
  dom.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  window.addEventListener('mouseup', stopDrag);
  dom.addEventListener('touchstart', (e) => { if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY); });
  dom.addEventListener('touchmove', (e) => { if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY); });
  window.addEventListener('touchend', stopDrag);
}

function animate() {
  requestAnimationFrame(animate);
  const time = Date.now() * 0.0015;

  if (!isDragging && cakeGroup) {
    cakeGroup.rotation.y += 0.002;
  }

  if (STATE.candlesLit) {
    flames.forEach((flame, idx) => {
      flame.scale.x = 1 + Math.sin(time * 10 + idx) * 0.1;
      flame.scale.z = 1 + Math.cos(time * 8 + idx) * 0.1;
    });
  }

  if (balloonsGroup && balloonsGroup.visible) {
    balloonsGroup.children.forEach((balloon) => {
      balloon.position.y += Math.sin(time + balloon.userData.factor) * 0.006;
      if (balloon.position.y > 10) {
        balloon.position.y = -5;
        balloon.position.x = (Math.random() - 0.5) * 18;
      }
    });
  }

  renderer.render(scene, camera);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}