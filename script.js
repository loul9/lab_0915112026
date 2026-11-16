import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ==========================================
// 1. VARIABLES GLOBALES Y ESTADO
// ==========================================
let scene, camera, renderer, controls;
let currentArtifact = null;
let artifactParts = [];
let explosionFactor = 0;
let rotSpeed = 1;
let isPowerOn = false;
let hands;

// Datos de los artefactos (📍 REEMPLAZAR con rutas a tus .glb reales)
const artifactsData = {
    linterna: {
        name: "Linterna",
        parts: [
            { name: "Pila/Batería", info: "Fuente de energía. Transforma energía química en eléctrica.", color: 0x6a00f4, pos: {x:0, y:-0.5, z:0} },
            { name: "Interruptor", info: "Controla el flujo de corriente, abriendo o cerrando el circuito.", color: 0xbc00dd, pos: {x:0, y:0, z:0.6} },
            { name: "Bombillo", info: "Transforma la energía eléctrica en energía lumínica y calórica.", color: 0xf20089, pos: {x:0, y:0.5, z:0} },
            { name: "Lente/Reflector", info: "Concentra y dirige el haz de luz hacia el frente.", color: 0xe500a4, pos: {x:0, y:0.8, z:0} }
        ],
        glbPath: 'models/linterna.glb' // 📍 REEMPLAZAR
    },
    timbre: {
        name: "Timbre",
        parts: [
            { name: "Fuente de alimentación", info: "Suministra la energía eléctrica necesaria (ej. transformador).", color: 0x2d00f7, pos: {x:-0.5, y:0, z:0} },
            { name: "Pulsador", info: "Interruptor momentáneo que cierra el circuito solo mientras se presiona.", color: 0x8900f2, pos: {x:0.5, y:0, z:0} },
            { name: "Electroimán", info: "Genera un campo magnético al pasar la corriente, atrayendo la armadura.", color: 0xa100f2, pos: {x:0, y:0, z:0} },
            { name: "Campana", info: "Elemento metálico que vibra y produce el sonido al ser golpeado.", color: 0xd100d1, pos: {x:0, y:0.5, z:0} }
        ],
        glbPath: 'models/timbre.glb' // 📍 REEMPLAZAR
    },
    ventilador: {
        name: "Ventilador de Mesa",
        parts: [
            { name: "Base", info: "Proporciona estabilidad y soporte al conjunto.", color: 0x2d00f7, pos: {x:0, y:-1, z:0} },
            { name: "Interruptor", info: "Permite seleccionar la velocidad o apagar el dispositivo.", color: 0x6a00f4, pos: {x:0, y:-0.5, z:0.4} },
            { name: "Motor", info: "Convierte la energía eléctrica del tomacorriente en energía mecánica de rotación.", color: 0xbc00dd, pos: {x:0, y:0, z:0} },
            { name: "Aspa/Hélice", info: "Empuja el aire generando corriente de ventilación.", color: 0xf20089, pos: {x:0, y:0.5, z:0} },
            { name: "Fuente (Tomacorriente)", info: "Suministro de energía eléctrica de la red domiciliaria (110V/220V).", color: 0xe500a4, pos: {x:0, y:-1, z:-0.5} }
        ],
        glbPath: 'models/ventilador.glb' // 📍 REEMPLAZAR
    }
};

// ==========================================
// 2. INICIALIZACIÓN Y UI
// ==========================================
window.startApp = () => {
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('mainInterface').classList.remove('hidden');
    init3D();
    loadArtifact('linterna');
    initQuiz();
    initFluxBackground();
};

// ==========================================
// 3. THREE.JS (VISOR 3D)
// ==========================================
function init3D() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a001a);

    camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1, 3);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // 📍 SI TIENES ARCHIVOS .GLB, DESCOMENTA ESTO:
    /*
    const loader = new GLTFLoader();
    loader.load(artifactsData['linterna'].glbPath, (gltf) => {
        scene.add(gltf.scene);
        // Aquí deberías asignar las partes del modelo a artifactParts para la explosión
    });
    */

    animate();
}

function loadArtifact(type) {
    // Limpiar escena (excepto luces)
    while(scene.children.length > 2){ 
        scene.remove(scene.children[2]); 
    }
    artifactParts = [];
    isPowerOn = false;
    updatePowerButton();

    const data = artifactsData[type];
    currentArtifact = type;

    // Actualizar botones UI
    document.querySelectorAll('.artifact-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Generar partes procedurales (📍 REEMPLAZAR con carga GLTF real)
    data.parts.forEach((part, index) => {
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const material = new THREE.MeshStandardMaterial({ 
            color: part.color,
            roughness: 0.3,
            metalness: 0.7
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Posición base
        mesh.userData = { 
            basePos: new THREE.Vector3(part.pos.x, part.pos.y, part.pos.z),
            name: part.name,
            info: part.info,
            id: index
        };
        mesh.position.copy(mesh.userData.basePos);
        
        scene.add(mesh);
        artifactParts.push(mesh);
    });

    // Ajustar cámara
    controls.reset();
    renderPartsList();
}

function renderPartsList() {
    const list = document.getElementById('partsList');
    list.innerHTML = '';
    artifactsData[currentArtifact].parts.forEach((part, index) => {
        const div = document.createElement('div');
        div.className = 'part-item';
        div.innerHTML = `<strong>${part.name}</strong><div class="part-info">${part.info}</div>`;
        div.onclick = () => selectPart(index, div);
        list.appendChild(div);
    });
}

function selectPart(index, element) {
    document.querySelectorAll('.part-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    // Resaltar en 3D
    artifactParts.forEach((mesh, i) => {
        mesh.material.emissive.setHex(i === index ? 0x444444 : 0x000000);
    });
}

// Slider de explosión
document.getElementById('explodeSlider').addEventListener('input', (e) => {
    explosionFactor = e.target.value / 100;
    artifactParts.forEach(mesh => {
        const dir = mesh.userData.basePos.clone().normalize();
        mesh.position.copy(mesh.userData.basePos).add(dir.multiplyScalar(explosionFactor * 2));
    });
});

// Velocidad de rotación
document.getElementById('rotSpeed').addEventListener('input', (e) => {
    rotSpeed = parseFloat(e.target.value);
});

function animate() {
    requestAnimationFrame(animate);
    
    if (rotSpeed > 0 && scene) {
        scene.rotation.y += 0.01 * rotSpeed;
    }

    // Animación de encendido específica
    if (isPowerOn) {
        if (currentArtifact === 'ventilador') {
            const aspa = artifactParts.find(p => p.userData.name.includes('Aspa'));
            if (aspa) aspa.rotation.y += 0.5;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

function toggleFullscreen() {
    const elem = document.getElementById('canvas-container');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => console.log(err));
    } else {
        document.exitFullscreen();
    }
}

// ==========================================
// 4. LÓGICA DE ENCENDIDO Y ANIMACIONES
// ==========================================
window.togglePower = () => {
    isPowerOn = !isPowerOn;
    updatePowerButton();
    
    const container = document.getElementById('canvas-container');
    
    if (isPowerOn) {
        playSound('powerOn');
        if (currentArtifact === 'linterna') {
            container.classList.add('flashlight-on');
            // Añadir luz puntual en 3D
            const light = new THREE.PointLight(0xffffaa, 2, 5);
            light.position.set(0, 1, 0);
            light.name = 'flashlightBeam';
            scene.add(light);
        } else if (currentArtifact === 'timbre') {
            container.classList.add('timbre-vibrating');
            playSound('bell');
        } else if (currentArtifact === 'ventilador') {
            // La animación de rotación se maneja en animate()
        }
    } else {
        container.classList.remove('flashlight-on', 'timbre-vibrating');
        const beam = scene.getObjectByName('flashlightBeam');
        if (beam) scene.remove(beam);
    }
};

function updatePowerButton() {
    const btn = document.getElementById('powerBtn');
    btn.textContent = isPowerOn ? '🔴 Apagar Artefacto' : '⚡ Encender Artefacto';
    btn.style.background = isPowerOn ? 'linear-gradient(135deg, #ff0000, #990000)' : '';
}

// ==========================================
// 5. MEDIPIPE HANDS
// ==========================================
window.startMediaPipe = () => {
    const videoElement = document.getElementById('input_video');
    const canvasElement = document.getElementById('output_canvas');
    const canvasCtx = canvasElement.getContext('2d');

    hands = new Hands({locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }});

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults((results) => {
        canvasCtx.save();
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {color: '#f20089', lineWidth: 2});
            drawLandmarks(canvasCtx, landmarks, {color: '#6a00f4', lineWidth: 1});

            // Lógica de interacción: Pinza (Índice y Pulgar)
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

            if (distance < 0.05) {
                // Gesto de pinza detectado: Seleccionar primera parte o activar
                canvasCtx.fillStyle = '#00ff00';
                canvasCtx.fillText("¡Pinza detectada! (Selección)", 10, 30);
                // Aquí puedes disparar la selección de una parte
            }

            // Rotación con la posición X de la mano
            const handX = landmarks[9].x; // Dedo medio
            scene.rotation.y = (handX - 0.5) * 4; 
        }
        canvasCtx.restore();
    });

    const cameraUtils = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({image: videoElement});
        },
        width: 320,
        height: 240
    });
    cameraUtils.start();
};

// ==========================================
// 6. SISTEMA DE QUIZ (20 PREGUNTAS)
// ==========================================
const quizData = [
    { q: "¿Qué componente de la linterna transforma la energía química en eléctrica?", options: ["Bombillo", "Pila/Batería", "Interruptor", "Lente"], a: 1 },
    { q: "En un timbre escolar, ¿qué elemento cierra el circuito al ser presionado?", options: ["Campana", "Electroimán", "Pulsador", "Fuente"], a: 2 },
    { q: "¿Qué parte del ventilador de mesa convierte la energía eléctrica en mecánica?", options: ["Aspa", "Base", "Interruptor", "Motor"], a: 3 },
    { q: "Según el MEN (2022), un artefacto es:", options: ["Un fenómeno natural", "Un objeto transformado por el ser humano para satisfacer una necesidad", "Solo un dispositivo electrónico", "Un software de computadora"], a: 1 },
    { q: "La Ley 115 de 1994 establece que la educación tecnológica debe fomentar:", options: ["La memorización de fórmulas", "La comprensión y uso adecuado de la tecnología", "Solo el manejo de herramientas", "La programación exclusiva"], a: 1 },
    { q: "¿Qué función cumple el lente en una linterna?", options: ["Generar electricidad", "Concentrar y dirigir el haz de luz", "Enfriar el bombillo", "Almacenar energía"], a: 1 },
    { q: "El tomacorriente en el ventilador actúa como:", options: ["Interruptor", "Fuente de energía de la red", "Motor", "Resistencia"], a: 1 },
    { q: "¿Qué sucede en el electroimán del timbre cuando se presiona el pulsador?", options: ["Se derrite", "Genera un campo magnético", "Se apaga", "Gira continuamente"], a: 1 },
    { q: "Un circuito eléctrico básico necesita obligatoriamente:", options: ["Solo un cable", "Fuente, conductor, carga y control", "Un motor grande", "Internet"], a: 1 },
    { q: "La energía que llega a nuestras casas por el tomacorriente es:", options: ["Energía química", "Energía eléctrica", "Energía solar directa", "Energía cinética"], a: 1 },
    { q: "¿Qué principio de la naturaleza de la tecnología se aplica al diseñar una linterna más eficiente?", options: ["La tecnología es estática", "La tecnología busca resolver problemas y mejora con el tiempo", "La tecnología no afecta el ambiente", "Los artefactos no requieren mantenimiento"], a: 1 },
    { q: "El aspa del ventilador es un ejemplo de transformación de energía:", options: ["Eléctrica a lumínica", "Mecánica a química", "Eléctrica a mecánica (cinética)", "Térmica a sonora"], a: 2 },
    { q: "¿Qué material es el más adecuado para los cables internos de estos artefactos?", options: ["Plástico", "Cobre", "Madera", "Vidrio"], a: 1 },
    { q: "El interruptor de la linterna actúa como:", options: ["Fuente de poder", "Elemento de control (abre/cierra circuito)", "Resistencia variable", "Transformador"], a: 1 },
    { q: "En el contexto del MEN, la 'apropiación de la tecnología' implica:", options: ["Solo comprar dispositivos", "Comprender, usar y evaluar críticamente los artefactos", "Desarmar todo sin entender", "Ignorar el impacto ambiental"], a: 1 },
    { q: "Si el bombillo de la linterna está fundido, el circuito está:", options: ["Cerrado", "Abierto", "En corto", "Sobrecargado"], a: 1 },
    { q: "La campana del timbre vibra debido a:", options: ["La gravedad", "El golpe de la armadura atraída por el electroimán", "El viento", "La presión del aire"], a: 1 },
    { q: "¿Qué medida de seguridad es crucial al manipular el ventilador conectado?", options: ["Usarlo bajo el agua", "Asegurar que las manos estén secas y no tocar partes móviles", "Cubrirlo con una manta", "Usarlo sin base"], a: 1 },
    { q: "Un modelo 3D 'explotado' sirve para:", options: ["Ocultar las piezas", "Visualizar la relación y ubicación de cada componente internamente", "Destruir el objeto", "Aumentar su peso"], a: 1 },
    { q: "La visión por computador (MediaPipe) en esta página permite:", options: ["Cocinar alimentos", "Interactuar con el modelo 3D usando gestos de las manos", "Imprimir en 3D", "Enviar correos"], a: 1 }
];

function initQuiz() {
    const container = document.getElementById('quiz-container');
    quizData.forEach((item, idx) => {
        const block = document.createElement('div');
        block.className = 'question-block';
        block.innerHTML = `
            <h4>${idx + 1}. ${item.q}</h4>
            <div class="options">
                ${item.options.map((opt, i) => `
                    <label>
                        <input type="radio" name="q${idx}" value="${i}" onchange="checkAnswer(${idx}, ${i})">
                        ${String.fromCharCode(65 + i)}. ${opt}
                    </label>
                `).join('')}
            </div>
        `;
        container.appendChild(block);
    });
}

window.checkAnswer = (qIdx, selected) => {
    const correct = quizData[qIdx].a;
    const feedback = document.getElementById('quiz-feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    
    if (selected === correct) {
        feedback.textContent = "¡Correcto! Excelente comprensión del concepto.";
        feedback.classList.add('correct');
        playSound('correct');
    } else {
        feedback.textContent = `Incorrecto. La respuesta correcta era: ${String.fromCharCode(65 + correct)}. ${quizData[qIdx].options[correct]}. Revisa los componentes y su función.`;
        feedback.classList.add('incorrect');
        playSound('incorrect');
    }
    
    setTimeout(() => {
        feedback.classList.add('hidden');
    }, 4000);
};

// ==========================================
// 7. AUDIO (Web Audio API para no depender de archivos externos)
// ==========================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'incorrect') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    } else if (type === 'powerOn') {
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
    }
}

// ==========================================
// 8. FONDO FLUX LINES (Canvas)
// ==========================================
function initFluxBackground() {
    const canvas = document.getElementById('fluxCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let lines = [];
    const colors = ['#2d00f7', '#6a00f4', '#8900f2', '#a100f2', '#b100e8', '#bc00dd', '#d100d1', '#db00b6', '#e500a4', '#f20089'];

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Line {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.length = Math.random() * 100 + 50;
            this.speed = Math.random() * 1 + 0.5;
            this.angle = Math.random() * Math.PI * 2;
            this.color = colors[Math.floor(Math.random() * colors.length)];
            this.width = Math.random() * 2 + 0.5;
        }
        update() {
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            this.angle += (Math.random() - 0.5) * 0.05;
            
            if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                this.reset();
            }
        }
        draw() {
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(this.angle) * this.length, this.y + Math.sin(this.angle) * this.length);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width;
            ctx.globalAlpha = 0.3;
            ctx.stroke();
        }
    }

    for (let i = 0; i < 50; i++) {
        lines.push(new Line());
    }

    function animateFlux() {
        ctx.clearRect(0, 0, width, height);
        lines.forEach(line => {
            line.update();
            line.draw();
        });
        requestAnimationFrame(animateFlux);
    }
    animateFlux();
}