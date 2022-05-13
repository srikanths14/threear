import * as THREE from './src/three.module.js';
import {GLTFLoader} from './loaders/GLTFLoader.js';
import {OrbitControls} from './loaders/OrbitControls.js';
import {ARButton} from './loaders/ARButton.js';

let camera,scene,renderer;
let orbControls;
let gltfLoader;
let sceneAsset;
let container;
let startTouchPose1;
let touchPose1;
let touchPose2;
let startDistance;
let currentDistance;
let activeSession = null;
let isRotationAnimationActive = false;
let enableRotateAnimation = false;
let enableMovement= false;
let enableScale = false;
let enableRotate = false;

let visualPointer;
let moveVisualPointer;

let hitTestSource = null;
let hitTestSourceRequested = false;

let touchRaycaster = null;
let arrowhelper = null;
let touchController = null;

let selectedObject =null;
let group = null;

let touchStarted = false;

initScene();
frameLoop();

function setupRenderEnvironment(){

    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = setupCamera();
    scene = setupScene();
    light

}

function setupCamera(){

    const cameraAspectRatio = window.innerWidth/window.innerHeight
    const cameraNearPlaneValue = 0.1;
    const cameraFarPlaneValue = 100;

    const perspectiveCamera = new THREE.PerspectiveCamera(70,cameraAspectRatio,cameraNearPlaneValue,cameraFarPlaneValue);
    perspectiveCamera.position.set(0,0.2,3);

    return perspectiveCamera;
}

function setupScene(){

    const rootScene = new THREE.Scene();
    return rootScene;
    
}

function setupSceneLights(){

    const sceneAmbientLight = new THREE.AmbientLight(0xffffff,0.5);
    const sceneDirectionalLight = THREE.DirectionalLight( 0xffffff, 1);
    directionalLight.position.set(0,2,5);

    var sceneLights = [];
    sceneLights.push(sceneAmbientLight);
    sceneLights.push(sceneDirectionalLight);

    return sceneLights;

}

function setupSceneRenderer(){

    const sceneRenderer = new THREE.WebGLRenderer({
        antialias:true,alpha:true
    });
    sceneRenderer.setPixelRatio(window.devicePixelRatio);
    sceneRenderer.setSize(window.innerWidth,window.innerHeight);
    sceneRenderer.outputEncoding = THREE.sRGBEncoding;
    sceneRenderer.xr.enabled =true;

    return sceneRenderer;
}

function initScene(){

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.1,100);
    camera.position.set(0,0.2,3);

    startTouchPose1 = new THREE.Vector3();
    touchPose1 = new THREE.Vector3();
    touchPose2 = new THREE.Vector3();
    touchRaycaster = new THREE.Raycaster();
    arrowhelper = new THREE.ArrowHelper();
    group = new THREE.Group();

    scene = new THREE.Scene();
    const light = new THREE.AmbientLight(0xffffff,0.5);
    scene.add(light);
    scene.add(arrowhelper);
    scene.add(group);
    
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 1);
    directionalLight.position.set(0,2,5);
    scene.add( directionalLight );

    loadGltf();

    renderer = new THREE.WebGLRenderer({
        antialias:true,alpha:true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.xr.enabled =true;
    container.appendChild(renderer.domElement);
    setOrbControls();
    createVisualPointer();
    
    document.body.appendChild(ARButton.createButton(renderer, {requiredFeatures: [ 'hit-test' ],optionalFeatures:['dom-overlay'],domOverlay: { root:document.body}}));

    renderer.domElement.addEventListener('touchstart',process_touchstart,false);
    
    createImageElement();
    showAssetUI();
    setupTouchController();
    window.addEventListener( 'resize', onWindowResize );

}

function process_touchstart(ev){

    ev.preventDefault();

    if(ev.touches.length==1){

        startTouchPose1.set(ev.touches[0].clientX,ev.touches[0].clientY,0).unproject(camera);

     }
    
    if(ev.touches.length==2){
        
        touchPose1.set(ev.touches[0].clientX,ev.touches[0].clientY,0).unproject(camera);
        touchPose2.set(ev.touches[1].clientX,ev.touches[1].clientY,0).unproject(camera);

        touchPose1.normalize();
        touchPose2.normalize();

        var inputA = touchPose1.x - touchPose2.x;
        var inputB = touchPose1.y - touchPose2.y;

        startDistance = Math.sqrt(inputA*inputA + inputB*inputB);

    }

    renderer.domElement.addEventListener('touchmove',process_touchmove,false);

}

function process_touchmove(ev){

    ev.preventDefault();

    if(ev.touches.length>1){

        if(enableScale ==true){

        touchPose1.set(ev.touches[0].clientX,ev.touches[0].clientY,0).unproject(camera);
        touchPose2.set(ev.touches[1].clientX,ev.touches[1].clientY,0).unproject(camera); 
        
        touchPose1.normalize();
        touchPose2.normalize();

        var inputA = touchPose1.x - touchPose2.x;
        var inputB = touchPose1.y - touchPose2.y;

        currentDistance = Math.sqrt(inputA*inputA + inputB*inputB);
        var distanceDiff = currentDistance - startDistance;
        var pinchAmount = distanceDiff * 0.02;

        sceneAsset.scale.x+=pinchAmount;
        sceneAsset.scale.y+=pinchAmount;
        sceneAsset.scale.z+=pinchAmount;
        }

    }

    if(ev.touches.length==1){

        if(enableRotate==true){

        touchPose1.set(ev.touches[0].clientX,ev.touches[0].clientY,0.1).unproject(camera);

        if(touchPose1.x>startTouchPose1.x){      
        sceneAsset.rotation.y+=touchPose1.x *0.002;
        console.log("Positive");
        }else{
            sceneAsset.rotation.y-=touchPose1.x*0.002;
            console.log("Negative");
        }
      }
    }

    if(ev.touches.length==1){

        if(enableMovement==true){


        }
    }

}


function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function createVisualPointer(){

    visualPointer = new THREE.Mesh(
        new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    visualPointer.matrixAutoUpdate = false;
    visualPointer.visible = false;
    scene.add( visualPointer );
}

function createMoveVisualPointer(){

    moveVisualPointer = new THREE.Mesh(
        new THREE.RingGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
        new THREE.MeshBasicMaterial()
    );
    moveVisualPointer.matrixAutoUpdate = false;
    moveVisualPointer.visible = false;
    scene.add( moveVisualPointer );
}

function loadGltf(){
    gltfLoader= new GLTFLoader().setPath('./Assets/EP3246_70_GLB_USDZ/');
    gltfLoader.load('EP3246_NT.glb',function(gltf){

      sceneAsset = gltf.scene;
      scene.add(gltf.scene);
    });
}

function createImageElement(){

    var img = document.createElement('img');
    img.id = 'qrcode-img';
    img.src = './Assets/ArThree-QRCode.png';
    img.setAttribute( 'width', 100 );
    img.setAttribute( 'height', 100 );
    img.style.position = 'absolute';
    img.style.left = '20px';
	img.style.top = '20px';

    container.appendChild(img);
    
}

function setOrbControls(){
    orbControls = new OrbitControls(camera,renderer.domElement);
    orbControls.minPolarAngle = Math.PI/2;
    orbControls.maxPolarAngle = Math.PI/2;
    orbControls.target.set(0,0.2,0);

}

function render(timestamp,frame){

    if(activeSession ==null ){
        orbControls.update();
    }

    rotateAsset();
    updateSceneAssetTransform();

    if(frame){

        const referenceSpace = renderer.xr.getReferenceSpace();
        activeSession = renderer.xr.getSession();
        
        if(hitTestSourceRequested===false){

            activeSession.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {

                activeSession.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                    hitTestSource = source;
                    removeQrCode();

                } );

            } );

            activeSession.addEventListener( 'end', function () {

                hitTestSourceRequested = false;
                hitTestSource = null;

            } );

            hitTestSourceRequested = true;

        }

        if ( hitTestSource ) {

            const hitTestResults = frame.getHitTestResults( hitTestSource );

            if ( hitTestResults.length ) {

                const hit = hitTestResults[ 0 ];

                visualPointer.visible = true;
                visualPointer.matrix.fromArray( hit.getPose( referenceSpace ).transform.matrix );

            } else {

                visualPointer.visible = false;

            }

        }



    }

    renderer.render(scene,camera);
}

function showAssetUI(){

    const uiContainer  = document.createElement('div');
    uiContainer.id = 'uiSpace';

    document.body.appendChild(uiContainer);

    const rotateButton = document.createElement('button');
    rotateButton.id = 'button-moveRight';
    rotateButton.style.display ='';
    rotateButton.style.position = 'absolute';
    rotateButton.textContent = 'Rotate';
    rotateButton.style.right = '30px';
    rotateButton.style.top = '70px';
    rotateButton.addEventListener('click',onRotateAsset);

    uiContainer.appendChild(rotateButton);

    const scaleButton = document.createElement('button');
    scaleButton.id ='button-moveForward';
    scaleButton.style.display ='';
    scaleButton.textContent = 'Scale';
    scaleButton.style.position = 'absolute';
    scaleButton.style.right = '30px';
    scaleButton.style.top = '110px';
    scaleButton.addEventListener('click',onScaleAsset);
   
    uiContainer.appendChild(scaleButton);

    const playAnimationButton = document.createElement('button');
    playAnimationButton.id = 'button-playAnimation';
    playAnimationButton.style.display ='';
    playAnimationButton.textContent = 'Play Animation';
    playAnimationButton.style.position = 'absolute';
    playAnimationButton.style.right = '30px';
    playAnimationButton.style.top = '150px';
    playAnimationButton.addEventListener('click',playRotationAnimation);

    uiContainer.appendChild(playAnimationButton);
    
}

function onMoveAsset(){

    if(sceneAsset!=null){

        enableMovement =true;
        enableRotate = false;
        enableScale =false;
        enableRotateAnimation = false;
        
    }

}

function onRotateAsset(){

    if(sceneAsset!=null){

        enableRotate =true;
        enableScale = false;
        enableMovement = false;
        enableRotateAnimation = false;
    }

}

function onScaleAsset(){

    if(sceneAsset!=null){

        enableScale =true;
        enableMovement = false;
        enableRotate = false;
        enableRotateAnimation = false;
    }

}

function playRotationAnimation(){

    if(isRotationAnimationActive==false){

        enableRotateAnimation =true;
        enableMovement = false;
        enableRotate = false;
        enableScale = false
    }else{
        enableRotateAnimation = false
    }

}

function removeQrCode(){
    var qrCode = document.getElementById('qrcode-img');
    if(qrCode!=null){
    qrCode.parentNode.removeChild(qrCode);
    }
}

function rotateAsset(){
    if(sceneAsset!=null && enableRotateAnimation==true){
        sceneAsset.rotation.y-=0.01;
        isRotationAnimationActive =true;

        var animationButtonElement = document.getElementById('button-playAnimation');
        animationButtonElement.textContent = 'Stop Animation';

    }else{
        var animationButtonElement = document.getElementById('button-playAnimation');
        animationButtonElement.textContent = 'Play Animation';
        isRotationAnimationActive = false;
    }
}

function setupTouchController(){

    touchController = renderer.xr.getController(0);
    touchController.addEventListener('selectstart',onTouchStarted);
    touchController.addEventListener('selectend',onTouchEnded);

    scene.add(touchController);

}

function onTouchStarted(){

    if(visualPointer!=null){

        if (visualPointer.visible) {      
            sceneAsset.position.setFromMatrixPosition(visualPointer.matrix);
            console.log(visualPointer.position);
        }
    }

    castRay();
    // castRay();
}

function onTouchEnded(){

    touchStarted = false;

}

function castRay(){

    if(touchController!=null){

        touchStarted = true;

        var touchWorldPosition = new THREE.Vector3().setFromMatrixPosition(touchController.matrixWorld);
        var cameraWorldPosition = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
        var touchDirection = touchWorldPosition.clone().sub(cameraWorldPosition).normalize();
        touchRaycaster.set(touchWorldPosition,touchDirection);

        arrowhelper.position.set(touchRaycaster.ray.origin);
        arrowhelper.setDirection(touchRaycaster.ray.direction);
        arrowhelper.setLength(touchRaycaster.ray.direction.length());
        arrowhelper.setColor(0xffff00);

        var collidedObjects = touchRaycaster.intersectObjects(scene.children);
    
        if(collidedObjects.length>0){

            const intersections = collidedObjects[0];
            selectedObject = intersections.object.parent;
            console.log(selectedObject.name);          
            console.log(selectedObject.getWorldPosition());
            console.log(sceneAsset.getWorldPosition());
    
        }

    }
}

function updateSceneAssetTransform(){

    if(selectedObject!=null && touchStarted==true){

        var touchWorldPositionA = new THREE.Vector3().setFromMatrixPosition(touchController.matrixWorld);
        // selectedObject.position.set(touchWorldPositionA);
        
    }

}



function frameLoop(){
    renderer.setAnimationLoop(render);
}