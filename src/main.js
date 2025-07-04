import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSG } from 'three-csg-ts';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// --- BASIC SETUP ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f2f5);
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(0, 50, 0);
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
controls.minDistance = 1;
controls.maxDistance = 150;
controls.maxPolarAngle = Math.PI / 1.5;

// --- PERSIST CAMERA STATE ---
function saveCameraState() {
    localStorage.setItem('cameraPosition', JSON.stringify(camera.position));
    localStorage.setItem('cameraRotation', JSON.stringify(camera.rotation));
    localStorage.setItem('cameraZoom', camera.zoom.toString());
    localStorage.setItem('controlsTarget', JSON.stringify(controls.target));
}

function loadCameraState() {
    const position = JSON.parse(localStorage.getItem('cameraPosition'));
    if (position) {
        camera.position.copy(position);
    }

    const rotation = JSON.parse(localStorage.getItem('cameraRotation'));
    if (rotation) {
        camera.rotation.set(rotation._x, rotation._y, rotation._z, rotation._order);
    }
    
    const zoom = localStorage.getItem('cameraZoom');
    if (zoom) {
        camera.zoom = parseFloat(zoom);
        camera.updateProjectionMatrix();
    }

    const target = JSON.parse(localStorage.getItem('controlsTarget'));
    if (target) {
        controls.target.copy(target);
    }

    controls.update();
}

controls.addEventListener('end', saveCameraState);
loadCameraState();

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
    base: new THREE.MeshStandardMaterial({ color: 0x9ca3af, name: 'Cassette Base' }),
    chip: new THREE.MeshStandardMaterial({ color: 0x1a202c, name: 'Microchip' }),
    needle: new THREE.MeshStandardMaterial({ color: 0xf6ad55, name: 'Needle/Port' }),
    slider: new THREE.MeshStandardMaterial({ color: 0x38a169, name: 'Sliding Track' }),
    cap: new THREE.MeshStandardMaterial({ color: 0x3182ce, name: 'Top Cap' })
};

// --- GEOMETRY & MESH CREATION ---
const componentGroup = new THREE.Group();
scene.add(componentGroup);

// EXACT chip dimensions from FreeCAD design
const chipLength = 26.5;
const chipWidth = 10.409;
const chipHeight = 1.325;

const baseLength = chipLength + 18; // Base is chip length + clearance for sliders (44.5mm)
const chipPlatformHeight = 2.25;
const baseWallHeight = 5.25;
const railTopY = 0.5;

// CORRECTED: Exact port center height from FreeCAD measurements
const chipPortCenterY = 3.163; // From FreeCAD: port center at Z=3.163

// --- ATTACHMENT MECHANISM CONFIGURATION ---
// Define shared parameters for cap attachment fins and base slots
const finThickness = 0.25;  // Much thinner fins
const finHeight = 2.5;
const finLength = 3.0;      // Slightly shorter

// Fin positions centered in the base wall width (only 4 side fins)
const outerWallZPosition = (chipWidth / 2) + 1.5; // Center of outer base walls
const finPositions = [
    // Side fins only - centered in the base wall width
    { x: 8, z: outerWallZPosition, orientation: 'side' },           // Right wall, front
    { x: -8, z: outerWallZPosition, orientation: 'side' },          // Right wall, back  
    { x: 8, z: -outerWallZPosition, orientation: 'side' },          // Left wall, front
    { x: -8, z: -outerWallZPosition, orientation: 'side' }          // Left wall, back
];

// 1. Cassette Base with T-Slot Grooves (matches FreeCAD CassetteBase)
const baseGroup = new THREE.Group();
const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(baseLength, 1.0, chipWidth + 2), materials.base);
mainFloor.position.y = -(mainFloor.geometry.parameters.height / 2);
mainFloor.receiveShadow = true;
baseGroup.add(mainFloor);

// --- Create the platform with precise FreeCAD dimensions ---
const platformWithRecess = new THREE.Group();

// The platform floor (matches FreeCAD ChipPlatform)
const platformFloor = new THREE.Mesh(
    new THREE.BoxGeometry(chipLength, chipPlatformHeight, chipWidth + 2),
    materials.base
);
platformFloor.position.y = chipPlatformHeight / 2;
platformFloor.receiveShadow = true;
platformWithRecess.add(platformFloor);

// CORRECTED: End wall height to match FreeCAD (2.75 height, extends to Z=4.55)
const endWallHeight = chipPlatformHeight + chipHeight - 0.825; // From FreeCAD measurements
const endWallYPos = chipPlatformHeight + (endWallHeight / 2) - 0.75; // Position to center the wall
const wallThickness = 1.0;

// 1. Add the full-length SOLID side walls (matches FreeCAD PlatformSideWalls)
const sideWallHeight = chipHeight; // Keep side walls at chip height
const sideWallYPos = chipPlatformHeight + (sideWallHeight / 2);
const sideWallGeo = new THREE.BoxGeometry(chipLength, sideWallHeight, wallThickness);
const leftWall = new THREE.Mesh(sideWallGeo, materials.base);
leftWall.position.set(0, sideWallYPos, -(chipWidth / 2) - (wallThickness / 2));
leftWall.receiveShadow = true;
const rightWall = new THREE.Mesh(sideWallGeo, materials.base);
rightWall.position.set(0, sideWallYPos, (chipWidth / 2) + (wallThickness / 2));
rightWall.receiveShadow = true;
platformWithRecess.add(leftWall, rightWall);

// 2. CORRECTED: End walls with proper height to reach slider top level
function createEndWall() {
    const wallGroup = new THREE.Group();
    const totalWallWidth = chipWidth + (2 * wallThickness);
    const cradleClearanceWidth = 4.0; 
    const endSegmentLength = (totalWallWidth - cradleClearanceWidth) / 2;
    const endSegmentGeo = new THREE.BoxGeometry(wallThickness, endWallHeight, endSegmentLength);
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
endWall1.position.set(xPos, endWallYPos, 0);
const endWall2 = createEndWall();
endWall2.position.set(-xPos, endWallYPos, 0);
platformWithRecess.add(endWall1, endWall2);

baseGroup.add(platformWithRecess);

// --- ADD ATTACHMENT SLOTS ---
// Create actual slot cutouts in the base walls where fins will insert
const slotDepth = finHeight; // Slots go deep enough for the fins

// Create cutouts for each fin position
const slotCutouts = [];
finPositions.forEach((pos, index) => {
    // Create slot cutout geometry - slightly larger than fin for clearance
    const slotGeometry = new THREE.BoxGeometry(finLength + 0.05, slotDepth + 0.1, finThickness + 0.05);
    
    const slotCutout = new THREE.Mesh(slotGeometry, materials.base);
    // Position cutout at the top of the base wall, extending downward
    // Wall top Y = baseWallHeight - 1.0, slot center Y = wall top - slotDepth/2
    const slotCenterY = (baseWallHeight - 1.0) - (slotDepth / 2);
    slotCutout.position.set(pos.x, slotCenterY, pos.z);
    slotCutout.updateMatrix();
    slotCutouts.push(slotCutout);
});

// Outer walls with slot cutouts (matches FreeCAD OuterWalls)
const outerWallLeftBase = new THREE.Mesh(new THREE.BoxGeometry(baseLength, baseWallHeight, 1), materials.base);
outerWallLeftBase.position.set(0, (baseWallHeight / 2) - 1.0, (chipWidth / 2) + 1.5);
outerWallLeftBase.updateMatrix();

const outerWallRightBase = new THREE.Mesh(new THREE.BoxGeometry(baseLength, baseWallHeight, 1), materials.base);
outerWallRightBase.position.set(0, (baseWallHeight / 2) - 1.0, -(chipWidth / 2) - 1.5);
outerWallRightBase.updateMatrix();

// Create CSG operations to subtract slots from walls
let leftWallCSG = CSG.fromMesh(outerWallLeftBase);
let rightWallCSG = CSG.fromMesh(outerWallRightBase);

// Subtract slot cutouts from appropriate walls
slotCutouts.forEach((cutout, index) => {
    const cutoutCSG = CSG.fromMesh(cutout);
    const pos = finPositions[index];
    
    if (pos.z > 0) {
        // Left wall (positive Z)
        leftWallCSG = leftWallCSG.subtract(cutoutCSG);
    } else {
        // Right wall (negative Z)
        rightWallCSG = rightWallCSG.subtract(cutoutCSG);
    }
});

// Create final walls with slots
const outerWallLeft = CSG.toMesh(leftWallCSG, outerWallLeftBase.matrix);
outerWallLeft.material = materials.base;
outerWallLeft.receiveShadow = true;
baseGroup.add(outerWallLeft);

const outerWallRight = CSG.toMesh(rightWallCSG, outerWallRightBase.matrix);
outerWallRight.material = materials.base;
outerWallRight.receiveShadow = true;
baseGroup.add(outerWallRight);

// T-slot rails (matches FreeCAD TSlotRails) with precise Y-positions
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
// FreeCAD rail positions (from measurements)
baseGroup.add(createTSlotRail(0, -4.5), createTSlotRail(0, -2.5), createTSlotRail(0, 2.5), createTSlotRail(0, 4.5));

baseGroup.name = "Cassette Base";
componentGroup.add(baseGroup);

// 2. Microchip (matches FreeCAD ChipMainBody with exact dimensions)
const chipGroup = new THREE.Group();

// --- Create chip body with integrated ports (matches FreeCAD design) ---
const mainChipShape = new THREE.Shape();

// Use half dimensions for easier drawing from the center
const halfLength = chipLength / 2;
const halfWidth = chipWidth / 2;

// Define port dimensions from real measurements (matches attached image)
const portFunnelDepth = 0; 
const portThroatHalfWidth = 0.4 / 2;      // 0.4mm width ÷ 2 = 0.2mm half-width
const portOpeningHalfWidth = 0.4 / 2;     // 0.4mm width ÷ 2 = 0.2mm half-width  
const portHeight = 0.45;                  // 0.45mm height (matches real measurement)

// Define the X coordinates for the port indentations
const portInnerX = halfLength;

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

mainChipShape.closePath();

const chipExtrudeSettings = {
    steps: 2,
    depth: chipHeight - 0.05,
    bevelEnabled: false
};

const chipBodyGeometry = new THREE.ExtrudeGeometry(mainChipShape, chipExtrudeSettings);
chipBodyGeometry.rotateX(-Math.PI / 2);
chipBodyGeometry.translate(0, -chipHeight / 2, 0);
const chipBodyMesh = new THREE.Mesh(chipBodyGeometry);

// --- Create bottom channel for subtraction (matches FreeCAD ChannelCutter) ---
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

// Position channel correctly (matches FreeCAD positioning)
const chipTopY = chipPlatformHeight + chipHeight;
const channelTopCover = 0.6;
const channelYPosition = chipTopY - channelTopCover;

const channelMatrix = new THREE.Matrix4();
const channelQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
const channelPosition = new THREE.Vector3(0, channelYPosition, 0);
channelMatrix.compose(channelPosition, channelQuaternion, new THREE.Vector3(1, 1, 1));
channelGeometry.applyMatrix4(channelMatrix);

const channelCSGMesh = new THREE.Mesh(channelGeometry);

// --- Create top recess for subtraction ---
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

// --- Perform CSG operations ---
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

// Position the entire chip assembly (matches FreeCAD positioning)
chipGroup.position.y = chipPlatformHeight + (chipHeight / 2);
chipGroup.name = "Microchip";
componentGroup.add(chipGroup);

// CORRECTED: Use exact needle alignment height from FreeCAD measurements
const needleAlignmentY = chipPlatformHeight + 0.65;

// --- CORRECTED SLIDER ASSEMBLY (matches FreeCAD SliderRight/SliderLeft assemblies exactly) ---
function createSliderAssembly(isFlipped) {
    const sliderGroup = new THREE.Group();
    sliderGroup.name = isFlipped ? "Slider Cart (L)" : "Slider Cart (R)";

    const sliderBaseHeight = 1.0; // From FreeCAD: main body height
    const sliderYPos = railTopY + sliderBaseHeight / 2;
    const cradleWidth = 1.0;
    
    // CORRECTED: Align cradle with front of main body (both start at same X in FreeCAD)
    const mainBodyWidth = 6; // From FreeCAD measurements
    const cradleLocalX = ((mainBodyWidth - cradleWidth) / 2) - 2; // Position cradle at front of main body
    
    // Main body (matches FreeCAD SliderRight_MainBody dimensions exactly)
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(mainBodyWidth, sliderBaseHeight, chipWidth + 2), materials.slider);
    mainBody.position.y = sliderYPos;
    mainBody.position.x = mainBodyWidth / 2; // Center the main body
    mainBody.castShadow = true;
    sliderGroup.add(mainBody);

    // T-slot hooks (matches FreeCAD hook components)
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

    // CORRECTED: Cradle positioned to align with front of main body and extend to proper height
    const cradleHeight = 4.25;
    const cradle = new THREE.Mesh(new THREE.BoxGeometry(cradleWidth, cradleHeight, 4), materials.slider);
    cradle.position.set(cradleLocalX, cradleHeight / 2, 0);
    cradle.castShadow = true;
    sliderGroup.add(cradle);

    // CORRECTED: Needle assembly with proper alignment and encapsulated luer port
    const needleAssembly = new THREE.Group();
    needleAssembly.name = "Needle Assembly";
    needleAssembly.castShadow = true;
    needleAssembly.position.set(cradleLocalX, needleAlignmentY, 0);

    // CORRECTED: Needle shaft length and positioning to match FreeCAD
    const needleShaftLength = 2.0; // From FreeCAD measurements
    const needleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, needleShaftLength, 16), materials.needle);
    needleShaft.rotation.z = Math.PI / 2;
    needleShaft.position.x = -(needleShaftLength / 2);
    needleAssembly.add(needleShaft);

    // CORRECTED: Luer port assembly positioned to be fully encased within cradle
    const luerPortGroup = new THREE.Group();
    // Position port closer to cradle center to ensure full encasement
    luerPortGroup.position.x = (cradleWidth / 2) - 0.45; // Moved inward from edge
    
    const portFlange = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.5, 32), materials.needle);
    portFlange.rotation.z = Math.PI / 2;
    portFlange.position.x = 0.25;
    luerPortGroup.add(portFlange);
    
    const mainPort = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 32), materials.needle); // Shortened to fit in cradle
    mainPort.rotation.z = Math.PI / 2;
    mainPort.position.x = 1.0; // Adjusted to stay within cradle bounds
    luerPortGroup.add(mainPort);
    
    const portHole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.55, 32), new THREE.MeshBasicMaterial({ color: 0x992211 }));
    portHole.rotation.z = Math.PI / 2;
    portHole.position.x = 1.0;
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

// 3. Top Cap (matches FreeCAD CorrectedTopCap dimensions exactly)
const topCapLength = 26.5;   // matches chip length
const topCapWidth = 10.409 + 2;  // matches chip width  
const topCapHeight = 1.5;  // from FreeCAD measurements

// Create comprehensive cap with roof extension and perimeter walls
const capGroup = new THREE.Group();

// Main cap body (existing dimensions)
const mainCap = new THREE.Mesh(
    new THREE.BoxGeometry(topCapLength, topCapHeight, topCapWidth), 
    materials.cap
);
mainCap.castShadow = false;

// Roof extension dimensions
const topCapRoofLength = baseLength;
const topCapRoofWidth = 10.409 + 4;
const topCapRoofHeight = 0.5;

// Create roof piece positioned at the top face of the main cap
const roofCap = new THREE.Mesh(
    new THREE.BoxGeometry(topCapRoofLength, topCapRoofHeight, topCapRoofWidth), 
    materials.cap
);
roofCap.position.set(0, 0.5, 0);
roofCap.castShadow = false;

// Add perimeter walls to eliminate gaps
const wallHeight = 0.5; // Height of the perimeter walls
const capWallThickness = 0.5; // Thickness of the walls

// Long edge walls (along the length of the cassette)
const longWallLength = topCapRoofLength;
const longWallGeometry = new THREE.BoxGeometry(longWallLength, wallHeight, capWallThickness * 2);

// Outer long walls
const outerLongWall1 = new THREE.Mesh(longWallGeometry, materials.cap);
outerLongWall1.position.set(0, 0.17, topCapRoofWidth/2 - capWallThickness);
outerLongWall1.castShadow = false;

const outerLongWall2 = new THREE.Mesh(longWallGeometry, materials.cap);
outerLongWall2.position.set(0, 0.17, -topCapRoofWidth/2 + capWallThickness);
outerLongWall2.castShadow = false;

// Short edge walls around chip perimeter
// const shortWallLength = topCapWidth - (2 * capWallThickness);
// const shortWallGeometry = new THREE.BoxGeometry(capWallThickness, wallHeight, shortWallLength);

// // Inner short walls (around chip area)
// const innerShortWall1 = new THREE.Mesh(shortWallGeometry, materials.cap);
// innerShortWall1.position.set(topCapLength/2, -wallHeight/2, 0);
// innerShortWall1.castShadow = true;

// const innerShortWall2 = new THREE.Mesh(shortWallGeometry, materials.cap);
// innerShortWall2.position.set(-topCapLength/2, -wallHeight/2, 0);
// innerShortWall2.castShadow = true;

// // Outer short walls (at the ends of the roof extension)
// const outerShortWallLength = topCapRoofWidth - (2 * capWallThickness);
// const outerShortWallGeometry = new THREE.BoxGeometry(capWallThickness, wallHeight, outerShortWallLength);

// const outerShortWall1 = new THREE.Mesh(outerShortWallGeometry, materials.cap);
// outerShortWall1.position.set(topCapRoofLength/2 - capWallThickness/2, -wallHeight/2, 0);
// outerShortWall1.castShadow = true;

// const outerShortWall2 = new THREE.Mesh(outerShortWallGeometry, materials.cap);
// outerShortWall2.position.set(-topCapRoofLength/2 + capWallThickness/2, -wallHeight/2, 0);
// outerShortWall2.castShadow = true;

  // --- ADD ATTACHMENT FINS ---
  // Create thin fins that extend downward from the cap for secure attachment

const attachmentFins = [];
finPositions.forEach((pos, index) => {
    // All fins are now side fins with the same geometry
    const finGeometry = new THREE.BoxGeometry(finLength, finHeight, finThickness);
    
    const fin = new THREE.Mesh(finGeometry, materials.cap);
    
    // Position fins centered in the base wall width, extending downward
    fin.position.set(pos.x, -(finHeight / 2) + 0.25, pos.z);
    fin.updateMatrix();
    attachmentFins.push(fin);
});

// Combine all pieces using CSG to create unified cap
mainCap.updateMatrix();
roofCap.updateMatrix();
outerLongWall1.updateMatrix();
outerLongWall2.updateMatrix();

let combinedCapCSG = CSG.fromMesh(mainCap);
combinedCapCSG = combinedCapCSG.union(CSG.fromMesh(roofCap));
combinedCapCSG = combinedCapCSG.union(CSG.fromMesh(outerLongWall1));
combinedCapCSG = combinedCapCSG.union(CSG.fromMesh(outerLongWall2));

// Add all attachment fins to the cap
attachmentFins.forEach(fin => {
    combinedCapCSG = combinedCapCSG.union(CSG.fromMesh(fin));
});

const cap = CSG.toMesh(combinedCapCSG, mainCap.matrix);
cap.material = materials.cap;
cap.castShadow = true;
cap.name = "Top Cap";

capGroup.add(cap);
componentGroup.add(capGroup);

// --- CORRECTED POSITIONING LOGIC (based on precise FreeCAD measurements) ---

// Chip edges (from FreeCAD)
const chipEdgeX = chipLength / 2; // 13.25
    
// CORRECTED: FreeCAD measurements for initial positions
// Right slider cradle center: X=18.75 (center of X=18.25 to 19.25)
// But we need to account for our local coordinate system where cradle is at cradleLocalX=2.5
const rightCradleCenterX = 20.75;  
const leftCradleCenterX = -20.75;

// Target positions for insertion (cradle front face flush with chip edge)
// Since cradle is now positioned at front of main body, adjust calculations accordingly
const cradleFrontFaceLocalX = (6/2) - (1.0/2); // 2.5 (front face of cradle relative to slider origin)
const targetSliderRightX = 13.25; 
const targetSliderLeftX = -13.25; 

// CORRECTED: Initial positions matching FreeCAD design
const initialPositions = {
    sliderRight: new THREE.Vector3(rightCradleCenterX - (6/2), 0, 0), // Adjust for local coordinate system
    sliderLeft: new THREE.Vector3(leftCradleCenterX + (6/2), 0, 0),   // Adjust for local coordinate system  
    cap: new THREE.Vector3(0, 15, 0) // Start elevated
};

const targetPositions = {
    sliderRight: new THREE.Vector3(targetSliderRightX, 0, 0),
    sliderLeft: new THREE.Vector3(targetSliderLeftX, 0, 0), 
    cap: new THREE.Vector3(0, chipPlatformHeight + chipHeight + (topCapHeight / 2), 0) // On top of chip
};

function resetToInitialState() {
    sliderRight.position.copy(initialPositions.sliderRight);
    sliderLeft.position.copy(initialPositions.sliderLeft);
    capGroup.position.copy(initialPositions.cap);
    capGroup.visible = true;
}
resetToInitialState();

// --- COMPONENT VISIBILITY CONTROLS ---
const visibilityControlsContainer = document.getElementById('visibility-controls');
const components = {
    "Base": baseGroup,
    "Chip": chipGroup,
    "Slider Cart (R)": sliderRight,
    "Slider Cart (L)": sliderLeft,
    "Top Cap": capGroup
};

Object.keys(components).forEach(name => {
    const div = document.createElement('div');
    div.className = 'checkbox-container';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `check-${name.replace(/\s+/g, '-')}`;
    checkbox.checked = true; // All components visible by default
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

// --- ANIMATION CONTROLS ---
let activeAnimations = 0;

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
    animate(capGroup, targetPositions.cap, 1000, 'position');
});

document.getElementById('export-ply-btn').addEventListener('click', () => {
    const exporter = new PLYExporter();
    const tempScene = new THREE.Scene();

    // Add only visible components to temporary scene
    for (const name in components) {
        const component = components[name];
        if (component.visible) {
            const clonedComponent = component.clone();
            tempScene.add(clonedComponent);
        }
    }

    // Add vertex colors based on material colors
    tempScene.traverse((object) => {
        if (object.isMesh && object.material) {
            const geometry = object.geometry;
            const material = object.material;
            
            // Check if geometry already has vertex colors
            if (!geometry.attributes.color) {
                const positions = geometry.attributes.position;
                const colors = new Float32Array(positions.count * 3);
                
                // Get color from material
                let color = new THREE.Color(0xffffff); // default white
                if (material.color) {
                    color = material.color;
                }
                
                // Apply the same color to all vertices
                for (let i = 0; i < positions.count; i++) {
                    colors[i * 3] = color.r;
                    colors[i * 3 + 1] = color.g;
                    colors[i * 3 + 2] = color.b;
                }
                
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
        }
    });

    const plyData = exporter.parse(tempScene, { binary: false });
    const blob = new Blob([plyData], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cassette-visible.ply';
    link.click();
});

// GLB Export - Perfect for online viewing and sharing
document.getElementById('export-glb-btn').addEventListener('click', () => {
    const exporter = new GLTFExporter();
    const tempScene = new THREE.Scene();

    // Add only visible components to temporary scene
    for (const name in components) {
        const component = components[name];
        if (component.visible) {
            const clonedComponent = component.clone();
            tempScene.add(clonedComponent);
        }
    }

    // Export as GLB (binary glTF) - single file with materials preserved
    exporter.parse(
        tempScene,
        (gltf) => {
            const blob = new Blob([gltf], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'cassette-visible.glb';
            link.click();
        },
        (error) => {
            console.error('GLB export failed:', error);
        },
        { binary: true }
    );
});

// HTML Export - Standalone viewer file
document.getElementById('export-html-btn').addEventListener('click', () => {
    const exporter = new GLTFExporter();
    const tempScene = new THREE.Scene();

    // Add only visible components to temporary scene
    for (const name in components) {
        const component = components[name];
        if (component.visible) {
            const clonedComponent = component.clone();
            tempScene.add(clonedComponent);
        }
    }

    // Export as glTF JSON for embedding in HTML
    exporter.parse(
        tempScene,
        (gltf) => {
            const gltfJson = JSON.stringify(gltf);
            
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cassette 3D Model</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: Arial, sans-serif;
        }
        canvas {
            display: block;
        }
        .info {
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 100;
        }
        .controls {
            position: absolute;
            bottom: 10px;
            left: 10px;
            color: white;
            background: rgba(0,0,0,0.7);
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 100;
        }
    </style>
</head>
<body>
    <div class="info">
        <h3>Cassette 3D Model</h3>
        <p>Interactive 3D model exported from Cassette Designer</p>
    </div>
    
    <div class="controls">
        <p><strong>Controls:</strong></p>
        <p>• Left mouse: Rotate</p>
        <p>• Right mouse: Pan</p>
        <p>• Scroll: Zoom</p>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script>
        // Embedded glTF data
        const gltfData = ${gltfJson};
        
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f2f5);
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 0);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        document.body.appendChild(renderer.domElement);
        
        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 1;
        controls.maxDistance = 150;
        controls.maxPolarAngle = Math.PI / 1.5;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
        directionalLight.position.set(-15, 25, 20);
        directionalLight.castShadow = true;
        scene.add(directionalLight);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(15, 10, -20);
        scene.add(directionalLight2);
        
        // Load the embedded model
        const loader = new THREE.GLTFLoader();
        loader.parse(JSON.stringify(gltfData), '', (gltf) => {
            const model = gltf.scene;
            scene.add(model);
            
            // Enable shadows
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        });
        
        // Render loop
        function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        animate();
    </script>
</body>
</html>`;

            const blob = new Blob([htmlContent], { type: 'text/html' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'cassette-viewer.html';
            link.click();
        },
        (error) => {
            console.error('HTML export failed:', error);
        },
        { binary: false }
    );
});

// --- RENDER LOOP ---
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