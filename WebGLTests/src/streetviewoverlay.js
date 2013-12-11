/**
    streetviewoverlay.js - Google Street View Overlay Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function StreetViewOverlay() {
    var SVO = {};    
    
    SVO.PANO_HEIGHT = 3; // I need this to see the ground 3d data 
    // on the ground. Still not sure about how to calculate it, for now it is
    // trial and error

    SVO.DEFAULT_FOCAL_LENGTH = 25; // Will be using the default 35 mm for frame size
    SVO.STREETVIEW_FOCAL_LENGTH_MULTIPLIER = 15; // Discovered experimentally. Imprecise but
    // a reasonable approximation I think
    SVO.STREETVIEW_ZOOM_CONSTANT = 50; // Discovered experimentally. Imprecise. Must be 
    // greater than 1 and smaller than 2
    SVO.STREETVIEW_DIV_ID = 'streetviewpano';
    SVO.THREEJS_DIV_ID = 'container';
    SVO.DEG2RAD = Math.PI / 180;
    SVO.RAD2DEG = 180 / Math.PI;
    
    SVO.objects3Dmaterial = null;
    
    SVO.currentPanorama = null;
    SVO.scene = new THREE.Scene();
    
    SVO.cameraParams = {focalLength: SVO.DEFAULT_FOCAL_LENGTH};
    SVO.camera = null;    
    
    SVO.light = null;
    
    SVO.renderer = null;
    
    SVO.container = SVO.THREEJS_DIV; // A div for the three js renderer
            
    SVO.dragView = {draggingView: false, mouseDownX: 0, mouseDownY: 0};
                    
    SVO.streetViewPano = null;  // A div for streetview    
    SVO.currentStreetViewZoom = 1;           
                    
    SVO.showing = {streetView: true, objects3D: false};
    
    SVO.mesh = false;
    
    SVO.load = function(showing, mesh, lat, lon) {
        $(document).ready(function(){
            SVO.showing= $.extend(SVO.showing, showing);
            SVO.mesh = mesh;
            // Obtain real panorama position (the closest one in Street View to
            // lat,lon and call init to start   
            SVO.realPanoPos(lat,lon, SVO.init); 
        });
    };
  
    SVO.init = function(latLng) {
        var i;
        
        SVO.currentPanorama = {};

        var panoPos = latLon2ThreeMeters(latLng.lat(),latLng.lng());
                
        SVO.currentPanorama.position = new THREE.Vector3(panoPos.x, panoPos.y, panoPos.z); 
        SVO.currentPanorama.position.y += 4;
    
        
        SVO.currentPanorama.heading = 0;           
        SVO.currentPanorama.pitch = 0;         
        SVO.container = $('#' + SVO.THREEJS_DIV_ID).get(0);
        
        if (SVO.showing.streetView) {
            SVO.cameraParams.focalLength = SVO.streetViewFocalLenght();
            SVO.initStreetView(latLng.lat(),latLng.lng());
        }              
        
        SVO.camera = new THREE.PerspectiveCamera( 
            1, // ANYTHING, WE ARE SETTING FOCAL LENGTH IN THE NEXT INSTRUCCION AND THAT OVERRIDES THIS            
            window.innerWidth / window.innerHeight, 1, 1100 );
        SVO.camera.setLens(SVO.cameraParams.focalLength); 
                              
        SVO.camera.position = SVO.currentPanorama.position;
                       
        // Sin esto, las rotaciones no me sirven. Son relativas a la posición de la cámara
        // así que si rota primero en X (por defecto es XYZ), el eje Y deja de apuntar al 
        // "techo" y la rotación en ese eje ya no me sirve. Si roto primero en el eje Y,
        //  la rotación en X no cambia (sigo "con los pies en el suelo") así que luego
        // puedo rotar en X lo que sea y listo.
        SVO.camera.rotation.order = 'YXZ';
        SVO.camera.rotation.x = SVO.currentPanorama.pitch * SVO.DEG2RAD;
        SVO.camera.rotation.y = -SVO.currentPanorama.heading * SVO.DEG2RAD;
        
        if (SVO.showing.objects3D) {
            SVO.scene.add(SVO.mesh);
            // A ground plane (so I can cast shadows)
            var planeGeo = new THREE.PlaneGeometry(20, 20);
            var planeMat = new THREE.MeshLambertMaterial({color: 0xAAAAAA, transparent: true, opacity: 0.5});
            var plane = new THREE.Mesh(planeGeo, planeMat);
            plane.rotation.x = -Math.PI/2;
            plane.position.y = 0;
            plane.receiveShadow = true;
            SVO.scene.add(plane);
        } 
        
        // Simple hemisphere light
        //SVO.light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
       
        // A spot light
        SVO.light = new THREE.SpotLight(0xffffbb);
        SVO.light.position.set( 200, 400, 400 ); // The position is chosen to be compatible
        // with the sun in the panorama we use
        SVO.light.castShadow = true; // only spotligths cast shadows in ThreeJS (I think...)
        SVO.scene.add(SVO.light);
        
        
        SVO.renderer = new THREE.WebGLRenderer({antialias: true});
        SVO.renderer.setSize(window.innerWidth, window.innerHeight);
        SVO.renderer.setClearColor(0x000000, 0); // TRANSPARENT BACKGROUND        
        SVO.renderer.shadowMapEnabled = true; // For shadows to be shown
        
        SVO.container.appendChild(SVO.renderer.domElement);
        
        SVO.attachEventHandlers();
        
        SVO.animate();
        
    };
    
    SVO.initStreetView = function(lat, lon) {                    
        SVO.streetViewPano = new google.maps.StreetViewPanorama($('#'+SVO.STREETVIEW_DIV_ID).get(0),
                             {disableDefaultUI: true});
                             
        var panoPos = new google.maps.LatLng(lat,lon);                
        var myPOV = {heading:SVO.currentPanorama.heading, pitch:SVO.currentPanorama.pitch, zoom:1};        
        SVO.streetViewPano.setPosition(panoPos);
        SVO.streetViewPano.setPov(myPOV);
    };
    
    SVO.updateStreetView = function() {                    
        var myPOV = {heading: SVO.currentHeading(), 
                     pitch:SVO.currentPitch(), zoom:SVO.currentStreetViewZoom};
                     
        SVO.streetViewPano.setPov(myPOV);
    };      
    
    SVO.realPanoPos = function(lat, lon, callBackFun) {                                                                
        var givenPanoPos = new google.maps.LatLng(lat, lon);                

        function processSVData(data, status) {
           if (status === google.maps.StreetViewStatus.OK) {
               callBackFun(data.location.latLng);               
               //data.location.latLng.lat(), data.location.latLng.lng());
           } else {
               throw new Error("Panorama not found");     
           }          
        }
        var sv = new google.maps.StreetViewService();
        // With a radius of 50 or less, this call returns information
        // about the closest streetview panorama to the given position.
        // In the callback function processSVData, the data
        // parameter can give us the TRUE position of the panorama.
        // This is necessary because the StreetViewPanorama object position
        // is the one we give to it, no the TRUE position of that panorama.
        sv.getPanoramaByLocation(givenPanoPos, 50, processSVData);                                  
    };
    
    // Returns a focal length "compatible" with a Google Street View background
    // given the current size of the window. (For Zoom level 1 for Street View)
    SVO.streetViewFocalLenght = function(zoomLevel) {
        if (!zoomLevel || zoomLevel < 1) {
            zoomLevel = 1;
        }
        if (window.innerWidth > 0) {            
            return (SVO.STREETVIEW_FOCAL_LENGTH_MULTIPLIER * window.innerWidth / window.innerHeight) 
                   + SVO.STREETVIEW_ZOOM_CONSTANT * (zoomLevel - 1);
            
        } else {
            // Just in case innerHeight is 0. If that happens, it does not matter which
            // focal length we return, because nothing will be shown
            return SVO.DEFAULT_FOCAL_LENGTH;
        }
    };
    

    SVO.currentHeading = function() {
      return -(SVO.camera.rotation.y * SVO.RAD2DEG);    
    };
    
    SVO.currentPitch = function() {
      return SVO.camera.rotation.x * SVO.RAD2DEG;    
    };
    
    
    SVO.attachEventHandlers = function() {    
        // click event does not get right click in Chromium; mousedown gets left
        // and right clicks properly in both Firefox and Chromium
      
        function onMouseWheel(event) {
            event.preventDefault();           
            event.stopPropagation();

                
            //SVO.cameraParams.focalLength += event.deltaY;
            if (event.deltaY > 0) {            
                SVO.currentStreetViewZoom += 1;
                SVO.cameraParams.focalLength = SVO.streetViewFocalLenght(SVO.currentStreetViewZoom);
            } else {
                if (SVO.currentStreetViewZoom > 1) {
                    SVO.currentStreetViewZoom -= 1;
                    SVO.cameraParams.focalLength = SVO.streetViewFocalLenght(SVO.currentStreetViewZoom);
                }
            }            
            
            
            SVO.camera.setLens(SVO.cameraParams.focalLength);
            SVO.camera.updateProjectionMatrix();
            
            SVO.updateStreetView();
            
            SVO.render();
        };  
        
        function onMouseDown(event) {
            event.preventDefault();           
            event.stopPropagation();
                
            SVO.dragView.draggingView = true;

            SVO.dragView.mouseDownX = event.clientX;
            SVO.dragView.mouseDownY = event.clientY;                                               
        };
        
        function onMouseUp(event) {
            event.preventDefault();           
            event.stopPropagation();
            SVO.dragView.draggingView = false;
        };
        
        function onMouseMove(event) {
            event.preventDefault();           
            event.stopPropagation();
            
            var horizontalMovement, verticalMovement;     
            
            var aspect = window.innerWidth / window.innerHeight;
            // horizontal FOV. Formula from <https://github.com/mrdoob/three.js/issues/1239>            
            var hFOV = 2 * Math.atan( Math.tan( (SVO.camera.fov * SVO.DEG2RAD) / 2 ) * aspect );
            
            if (SVO.dragView.draggingView) {
                horizontalMovement = SVO.dragView.mouseDownX  - event.clientX;
                verticalMovement  = SVO.dragView.mouseDownY  - event.clientY;
                
                // El /N es a ojo, no termino de ver por qué hace falta si los otros parámetros son correctos...                
                SVO.camera.rotation.y = (SVO.camera.rotation.y - ((horizontalMovement/4) * hFOV / window.innerWidth)) % (2 * Math.PI);                
                SVO.camera.rotation.x = SVO.camera.rotation.x + ((verticalMovement/4) *  (SVO.camera.fov * SVO.DEG2RAD) / window.innerHeight);
                SVO.camera.rotation.x = Math.max(-Math.PI/2, Math.min( Math.PI/2, SVO.camera.rotation.x));                
                
                SVO.updateStreetView();
            }
        };
        
        function onWindowResize() {
            SVO.camera.aspect = window.innerWidth / window.innerHeight;
            if (SVO.showing.streetView) {
              SVO.cameraParams.focalLength = SVO.streetViewFocalLenght();
              SVO.camera.setLens(SVO.cameraParams.focalLength);    
            }                                    
            SVO.camera.updateProjectionMatrix();
            SVO.renderer.setSize( window.innerWidth, window.innerHeight );
        };
        
        function onKeyUp(event) {
            switch (event.which) {
                case 13: // return
                case 32: // space         
                    event.preventDefault();
                    event.stopPropagation();
                    // NECESITO UNA FUNCIÓN RELOAD QUE ME PERMITA CAMBIAR SOLO EL CENTRO DEL PANORAMA
                    SVO.load({streetView: true, objects3D: true}, SVO.mesh, 41.684196,-0.888992);                                      
                default:
                    // Nothing. I have found it important not to interfere at all 
                    // with keys I do not use.
            }
        };
      
        $(document).mousewheel(onMouseWheel);
        $(document).mousedown(onMouseDown);
        $(document).mouseup(onMouseUp);
        $(document).mousemove(onMouseMove);
        $(window).resize(onWindowResize);
        $(document).on("keyup", onKeyUp);
        
    };
    
 
    SVO.animate = function() {
        requestAnimationFrame(SVO.animate);
        SVO.render();
    };

    SVO.render = function() {        
        SVO.renderer.render(SVO.scene, SVO.camera );
    };
    
    return SVO;
};