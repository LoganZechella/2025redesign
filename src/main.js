import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';

// --- BASIC SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f2f5);
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(25, 20, 35);
const renderer = new THREE.WebGLRenderer({
    antialias: true
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// --- CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI / 1.5;

// --- LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(-15, 25, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
directionalLight2.position.set(15, 10, -20);
scene.add(directionalLight2);

// --- MATERIALS ---
const materials = {
    base: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, name: 'Cassette Base' }),
    chip: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, name: 'Microchip' }),
    needle: new THREE.MeshStandardMaterial({ color: 0xff4136, name: 'Needle/Port' }),
    slider: new THREE.MeshStandardMaterial({ color: 0x0077ff, name: 'Sliding Track' }), 
    cap: new THREE.MeshStandardMaterial({ color: 0xffdc00, name: 'Top Cap' })
};

// --- GEOMETRY & MESH CREATION ---
const componentGroup = new THREE.Group();
scene.add(componentGroup);

// NEW: Exact chip dimensions from schematics
const chipLength = 26.5;
const chipWidth = 10.409;
const chipHeight = 1.325;

const baseLength = chipLength + 18; // Base is chip length + clearance for sliders
const chipPlatformHeight = 2.5,
    baseWallHeight = 4.1,
    railTopY = 0.5;

// 1. Cassette Base with T-Slot Grooves
const baseGroup = new THREE.Group();
const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(baseLength, 0.2, chipWidth + 2), materials.base);
mainFloor.position.y = -0.1;
mainFloor.receiveShadow = true;
baseGroup.add(mainFloor);

// --- Create the FINAL platform with a recess and correct cutouts ---
const platformWithRecess = new THREE.Group();

// The platform floor, wider to close gaps
const platformFloor = new THREE.Mesh(
    new THREE.BoxGeometry(chipLength, chipPlatformHeight, chipWidth + 2),
    materials.base
);
platformFloor.position.y = chipPlatformHeight / 2;
platformFloor.receiveShadow = true;
platformWithRecess.add(platformFloor);

const wallHeight = 1;
const wallYPos = chipPlatformHeight + (wallHeight / 2);
const wallThickness = 1.0;

// 1. Add the full-length SOLID side walls
const sideWallGeo = new THREE.BoxGeometry(chipLength, wallHeight, wallThickness);
const leftWall = new THREE.Mesh(sideWallGeo, materials.base);
leftWall.position.set(0, wallYPos, -(chipWidth / 2) - (wallThickness / 2));
leftWall.receiveShadow = true;
const rightWall = new THREE.Mesh(sideWallGeo, materials.base);
rightWall.position.set(0, wallYPos, (chipWidth / 2) + (wallThickness / 2));
rightWall.receiveShadow = true;
platformWithRecess.add(leftWall, rightWall);

// 2. Create the notched END walls for cradle clearance
function createEndWall() {
    const wallGroup = new THREE.Group();
    const totalWallWidth = chipWidth + (2 * wallThickness);
    const cradleClearanceWidth = 4.0; 
    const endSegmentLength = (totalWallWidth - cradleClearanceWidth) / 2;
    const endSegmentGeo = new THREE.BoxGeometry(wallThickness, wallHeight, endSegmentLength);
    
    const segment1 = new THREE.Mesh(endSegmentGeo, materials.base);
    segment1.position.z = -(cradleClearanceWidth / 2) - (endSegmentLength / 2);
    segment1.receiveShadow = true;
    const segment2 = new THREE.Mesh(endSegmentGeo, materials.base);
    segment2.position.z = (cradleClearanceWidth / 2) + (endSegmentLength / 2);
    segment2.receiveShadow = true;
    wallGroup.add(segment1, segment2);
    return wallGroup;
}

const xPos = (chipLength / 2) + (wallThickness / 2);
const endWall1 = createEndWall();
endWall1.position.set(xPos, wallYPos, 0);
endWall1.scale.set(1, 2, 1);
endWall1.position.y = chipPlatformHeight;
const endWall2 = createEndWall();
endWall2.position.set(-xPos, wallYPos, 0);
endWall2.scale.set(1, 2, 1);
endWall2.position.y = chipPlatformHeight;

platformWithRecess.add(endWall1, endWall2);

baseGroup.add(platformWithRecess);

const outerWallLeft = new THREE.Mesh(new THREE.BoxGeometry(baseLength, baseWallHeight, 1), materials.base);
outerWallLeft.position.set(0, (baseWallHeight / 2) - 0.2, (chipWidth / 2) + 1.5);
outerWallLeft.receiveShadow = true;
baseGroup.add(outerWallLeft);
const outerWallRight = new THREE.Mesh(new THREE.BoxGeometry(baseLength, baseWallHeight, 1), materials.base);
outerWallRight.position.set(0, (baseWallHeight / 2) - 0.2, -(chipWidth / 2) - 1.5);
outerWallRight.receiveShadow = true;
baseGroup.add(outerWallRight);

function createTSlotRail(x, z) {
    const tSlotGroup = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.BoxGeometry(baseLength, railTopY, 0.5), materials.base);
    stem.position.set(x, railTopY / 2, z);
    stem.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.BoxGeometry(baseLength, 0.2, 1.5), materials.base);
    top.position.set(x, railTopY - 0.1, z);
    top.receiveShadow = true;
    tSlotGroup.add(stem, top);
    return tSlotGroup;
}
baseGroup.add(createTSlotRail(0, -4.5), createTSlotRail(0, -2.5), createTSlotRail(0, 2.5), createTSlotRail(0, 4.5));
baseGroup.name = "Cassette Base";
componentGroup.add(baseGroup);

// 2. Microchip (with exact dimensions)
const chipGroup = new THREE.Group();

// --- Create a new, dimensionally-accurate chip body with integrated ports ---
const mainChipShape = new THREE.Shape();

// Use half dimensions for easier drawing from the center
const halfLength = chipLength / 2;
const halfWidth = chipWidth / 2;

// Define port dimensions from schematics. User has adjusted portFunnelDepth.
const portFunnelDepth = 0.1; 
const portThroatHalfWidth = 0.4 / 2;
const portOpeningHalfWidth = 1 / 2;

// Define the X coordinates for the port indentations
const portInnerX = halfLength - 0.1;

// Start drawing the 2D profile from the bottom-left corner
mainChipShape.moveTo(-halfLength, -halfWidth);
mainChipShape.lineTo(halfLength, -halfWidth); // Bottom edge

// Symmetrical Right-side port cutout
mainChipShape.lineTo(halfLength, -portOpeningHalfWidth);
mainChipShape.lineTo(portInnerX, -portThroatHalfWidth);
mainChipShape.lineTo(portInnerX, portThroatHalfWidth);
mainChipShape.lineTo(halfLength, portOpeningHalfWidth);

mainChipShape.lineTo(halfLength, halfWidth); // Top-right corner
mainChipShape.lineTo(-halfLength, halfWidth); // Top edge

// Symmetrical Left-side port cutout
mainChipShape.lineTo(-halfLength, portOpeningHalfWidth);
mainChipShape.lineTo(-portInnerX, portThroatHalfWidth);
mainChipShape.lineTo(-portInnerX, -portThroatHalfWidth);
mainChipShape.lineTo(-halfLength, -portOpeningHalfWidth);

mainChipShape.closePath(); // Close the shape back to the start

const chipExtrudeSettings = {
    steps: 2,
    depth: chipHeight - 0.05,
    bevelEnabled: false
};

const chipBodyGeometry = new THREE.ExtrudeGeometry(mainChipShape, chipExtrudeSettings);
chipBodyGeometry.rotateX(-Math.PI / 2);
chipBodyGeometry.translate(0, -chipHeight / 2, 0);
const chipBodyMesh = new THREE.Mesh(chipBodyGeometry); // For CSG

// --- 1. Create and position the BOTTOM CHANNEL for subtraction ---
const channelShape = new THREE.Shape();
const channelLowerWidth = 1.4;
const channelUpperWidth = 0.4;
const channelLowerPartHeight = 0.275;
const channelTotalHeight = 0.45;

channelShape.moveTo(-channelLowerWidth / 2, 0);
channelShape.lineTo(-channelLowerWidth / 2, channelLowerPartHeight);
channelShape.lineTo(-channelUpperWidth / 2, channelLowerPartHeight);
channelShape.lineTo(-channelUpperWidth / 2, channelTotalHeight);
channelShape.lineTo(channelUpperWidth / 2, channelTotalHeight);
channelShape.lineTo(channelUpperWidth / 2, channelLowerPartHeight);
channelShape.lineTo(channelLowerWidth / 2, channelLowerPartHeight);
channelShape.lineTo(channelLowerWidth / 2, 0);
channelShape.closePath();

const channelExtrudeSettings = { depth: chipLength, bevelEnabled: false };
const channelGeometry = new THREE.ExtrudeGeometry(channelShape, channelExtrudeSettings);

// Correctly position the channel vertically to create a "porthole"
// It should be 0.6mm below the top surface of the chip.
const chipTopY = chipPlatformHeight + chipHeight; // Top of chip geometry (includes bevel)
const channelTopCover = 0.6;
const channelYPosition = chipTopY - channelTopCover;


const channelMatrix = new THREE.Matrix4();
const channelQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
const channelPosition = new THREE.Vector3(0, channelYPosition, 0);
channelMatrix.compose(channelPosition, channelQuaternion, new THREE.Vector3(1, 1, 1));
channelGeometry.applyMatrix4(channelMatrix);

const channelCSGMesh = new THREE.Mesh(channelGeometry);

// --- 2. Create and position the TOP RECESS for subtraction ---
const recessDepth = 0.6;
const recessShape = new THREE.Shape();
const recessHalfWidth = (chipWidth - 2.0) / 2;
const recessX = (halfLength - portFunnelDepth);
const recessCornerX = recessX - 2.0;

recessShape.moveTo(-recessCornerX, recessHalfWidth);
recessShape.lineTo(recessCornerX, recessHalfWidth);
recessShape.lineTo(recessX, portThroatHalfWidth);
recessShape.lineTo(recessX, -portThroatHalfWidth);
recessShape.lineTo(recessCornerX, -recessHalfWidth);
recessShape.lineTo(-recessCornerX, -recessHalfWidth);
recessShape.lineTo(-recessX, -portThroatHalfWidth);
recessShape.lineTo(-recessX, portThroatHalfWidth);
recessShape.closePath();

const recessExtrudeSettings = { depth: recessDepth, bevelEnabled: false };
const recessGeometry = new THREE.ExtrudeGeometry(recessShape, recessExtrudeSettings);

const recessMatrix = new THREE.Matrix4();
const recessQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const recessYPosition = -recessDepth / 2 - 0.025;
recessMatrix.compose(new THREE.Vector3(0, recessYPosition, 0), recessQuaternion, new THREE.Vector3(1, 1, 1));
recessGeometry.applyMatrix4(recessMatrix);

const recessCSGMesh = new THREE.Mesh(recessGeometry);

// --- Perform all CSG operations ---
chipBodyMesh.updateMatrix();
channelCSGMesh.updateMatrix();
recessCSGMesh.updateMatrix();

let finalChipCSG = CSG.fromMesh(chipBodyMesh)
    .subtract(CSG.fromMesh(channelCSGMesh))
    .subtract(CSG.fromMesh(recessCSGMesh));

const finalChipMesh = CSG.toMesh(finalChipCSG, chipBodyMesh.matrix);
finalChipMesh.material = materials.chip;
finalChipMesh.castShadow = true;
chipGroup.add(finalChipMesh);

// --- 3. Create and add the GLASS LID ---
// The glass lid is now a thin sheet that sits in the shallow recess.
const glassLidExtrudeSettings = { depth: 0.05, bevelEnabled: false};
const glassLidGeom = new THREE.ExtrudeGeometry(recessShape, glassLidExtrudeSettings);
const glassLidMatrix = new THREE.Matrix4();
const glassLidQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const glassLidYPosition = recessDepth + 0.05;
glassLidMatrix.compose(new THREE.Vector3(0, glassLidYPosition, 0), glassLidQuaternion, new THREE.Vector3(1, 1, 1));
glassLidGeom.applyMatrix4(glassLidMatrix);

const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xdbfefe,
    transparent: true,
    opacity: 0.3,
    roughness: 0,
    metalness: 0.1,
    envMapIntensity: 1.5
});
const glassLidMesh = new THREE.Mesh(glassLidGeom, glassMaterial);
glassLidMesh.name = "Glass Lid";
chipGroup.add(glassLidMesh);

// Position the entire chip assembly
chipGroup.position.y = chipPlatformHeight + (chipHeight / 2);
chipGroup.name = "Microchip";
componentGroup.add(chipGroup);

const needleAlignmentY = chipGroup.position.y;

// --- RE-ENGINEERED SLIDER ASSEMBLY FUNCTION ---
function createSliderAssembly(isFlipped) {
    const sliderGroup = new THREE.Group();
    sliderGroup.name = isFlipped ? "Slider Cart (L)" : "Slider Cart (R)";

    const sliderBaseHeight = 1;
    const sliderYPos = railTopY + sliderBaseHeight / 2;
    const cradleWidth = 1.0;
    const cradleLocalX = 0;

    // Main body is now defined and positioned relative to the front cradle
    const mainBodyWidth = 5;
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(mainBodyWidth + 1, sliderBaseHeight, chipWidth + 2), materials.slider);
    mainBody.position.y = sliderYPos;
    mainBody.position.x = cradleLocalX + cradleWidth / 2 + (mainBodyWidth / 2 - 0.5);
    mainBody.castShadow = true;
    sliderGroup.add(mainBody);

    // T-slot hooks are attached to the main body
    const hookStemGeo = new THREE.BoxGeometry(mainBodyWidth, 0.4, 0.5);
    const hookFootGeo = new THREE.BoxGeometry(mainBodyWidth, 0.4, 1.5);
    const hook1_stem = new THREE.Mesh(hookStemGeo, materials.slider);
    hook1_stem.position.set(mainBody.position.x, sliderYPos - (sliderBaseHeight / 2) - 0.2, -3.5);
    const hook1_foot = new THREE.Mesh(hookFootGeo, materials.slider);
    hook1_foot.position.set(mainBody.position.x, sliderYPos - (sliderBaseHeight / 2) - 0.4, -3.5);
    const hook2_stem = new THREE.Mesh(hookStemGeo, materials.slider);
    hook2_stem.position.set(mainBody.position.x, sliderYPos - (sliderBaseHeight / 2) - 0.2, 3.5);
    const hook2_foot = new THREE.Mesh(hookFootGeo, materials.slider);
    hook2_foot.position.set(mainBody.position.x, sliderYPos - (sliderBaseHeight / 2) - 0.4, 3.5);
    sliderGroup.add(hook1_stem, hook1_foot, hook2_stem, hook2_foot);

    // The cradle is the origin of the slider group
    const cradleHeight = needleAlignmentY - railTopY + 0.5;
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(cradleWidth, cradleHeight, 4), materials.slider);
    cradle.position.set(cradleLocalX, railTopY + cradleHeight / 2, 0);
    cradle.castShadow = true;
    sliderGroup.add(cradle);

    const needleAssembly = new THREE.Group();
    needleAssembly.name = "Needle Assembly";
    needleAssembly.castShadow = true;
    needleAssembly.position.set(cradleLocalX, needleAlignmentY, 0);

    const needleShaftLength = 3.0;
    const needleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, needleShaftLength, 16), materials.needle);
    needleShaft.rotation.z = Math.PI / 2;
    needleShaft.position.x = -(needleShaftLength / 2);
    needleAssembly.add(needleShaft);

    const luerPortGroup = new THREE.Group();
    luerPortGroup.position.x = cradleWidth / 2;
    const portFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32), materials.needle);
    portFlange.rotation.z = Math.PI / 2;
    portFlange.position.x = 0.25;
    luerPortGroup.add(portFlange);
    const mainPort = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 32), materials.needle);
    mainPort.rotation.z = Math.PI / 2;
    mainPort.position.x = 1.5;
    luerPortGroup.add(mainPort);
    const portHole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.05, 32), new THREE.MeshBasicMaterial({ color: 0x992211 }));
    portHole.rotation.z = Math.PI / 2;
    portHole.position.x = 1.5;
    luerPortGroup.add(portHole);

    needleAssembly.add(luerPortGroup);
    sliderGroup.add(needleAssembly);

    if (isFlipped) {
        sliderGroup.rotation.y = Math.PI;
    }
    return sliderGroup;
}

const sliderRight = createSliderAssembly(false);
const sliderLeft = createSliderAssembly(true);
componentGroup.add(sliderRight, sliderLeft);

const cap = new THREE.Mesh(new THREE.BoxGeometry(baseLength + 2, 2, chipWidth + 4), materials.cap);
cap.castShadow = true;
cap.name = "Top Cap";
componentGroup.add(cap);

// --- FINALIZED POSITIONS & STATES ---
const chipEdgeX = chipLength / 2; // 13.25
const cradleFrontFaceLocalX = -0.5; // Front face of cradle (width=1) relative to slider origin (x=0)

// Final position: Front face of cradle must be flush with chip face.
const targetSliderX = chipEdgeX - cradleFrontFaceLocalX; // 13.25 - (-0.5) = 13.75

// Initial Position: Needle tip must be clear of chip face with 1mm clearance
const needleTipLocalX = cradleFrontFaceLocalX - 3.5; // -0.5 - 3.5 = -4.0
const initialSliderX = chipEdgeX - needleTipLocalX + 1.0; // 13.25 - (-4.0) + 1.0 = 18.25

const initialPositions = {
    sliderRight: new THREE.Vector3(initialSliderX, 0, 0),
    sliderLeft: new THREE.Vector3(-initialSliderX, 0, 0),
    cap: new THREE.Vector3(0, 20, 0)
};

const targetPositions = {
    sliderRight: new THREE.Vector3(targetSliderX, 0, 0),
    sliderLeft: new THREE.Vector3(-targetSliderX, 0, 0),
    cap: new THREE.Vector3(0, baseWallHeight + 1, 0)
};

function resetToInitialState() {
    sliderRight.position.copy(initialPositions.sliderRight);
    sliderLeft.position.copy(initialPositions.sliderLeft);
    cap.position.copy(initialPositions.cap);
    cap.visible = true;
}
resetToInitialState();

const visibilityControlsContainer = document.getElementById('visibility-controls');
const components = {
    "Base": baseGroup,
    "Chip": chipGroup,
    "Slider Cart (R)": sliderRight,
    "Slider Cart (L)": sliderLeft,
    "Top Cap": cap,
    "Glass Lid": chipGroup.children.find(c => c.name === "Glass Lid")
};
Object.keys(components).forEach(name => {
    const div = document.createElement('div');
    div.className = 'checkbox-container';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check-${name.replace(/\s+/g, '-')}`;
    checkbox.checked = true;
    checkbox.addEventListener('change', (event) => {
        components[name].visible = event.target.checked;
    });
    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = name;
    div.appendChild(checkbox);
    div.appendChild(label);
    visibilityControlsContainer.appendChild(div);
});

let activeAnimations = 0;
const animationButtons = document.querySelectorAll('#animation-controls button');
const secureNeedlesBtn = document.getElementById('secure-needles-btn');
if (secureNeedlesBtn) {
    secureNeedlesBtn.parentNode.removeChild(secureNeedlesBtn);
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('#animation-controls button').forEach(button => button.disabled = disabled);
}

function animate(object, target, duration, property) {
    activeAnimations++;
    setButtonsDisabled(true);
    const start = object[property].clone();
    let startTime = null;

    function animationStep(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeOutProgress = 1 - Math.pow(1 - progress, 4);

        if (property === 'position') {
            object.position.lerpVectors(start, target, easeOutProgress);
        }

        if (progress < 1) {
            requestAnimationFrame(animationStep);
        } else {
            activeAnimations--;
            if (activeAnimations === 0) {
                setButtonsDisabled(false);
            }
        }
    }
    requestAnimationFrame(animationStep);
}

document.getElementById('reset-btn').addEventListener('click', () => {
    if (activeAnimations === 0) resetToInitialState();
});
document.getElementById('slide-lock-btn').addEventListener('click', () => {
    animate(sliderRight, targetPositions.sliderRight, 1000, 'position');
    animate(sliderLeft, targetPositions.sliderLeft, 1000, 'position');
});
document.getElementById('assemble-btn').addEventListener('click', () => {
    animate(cap, targetPositions.cap, 1000, 'position');
});

function animateLoop() {
    requestAnimationFrame(animateLoop);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onWindowResize);
animateLoop(); 