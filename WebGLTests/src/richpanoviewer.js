/**
    richpanoviewer.js - Rich Panorama Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function RichPanoViewer() {
    var RPV = {};    
    
    RPV.PANO_HEIGHT = 3; // I need this to see the ground 3d data 
    // on the ground. Still not sure about how to calculate it, for now it is
    // trial and error
    //RPV.STREETVIEW_FOV = 35; // Trial and error. PARECE SER QUE ES DEPENDIENTE DEL ASPECT RATIO
    //RPV.DEFAULT_FOV = 70;
    RPV.DEFAULT_FOCAL_LENGTH = 25; // Will be using the default 35 mm for frame size
    RPV.STREETVIEW_FOCAL_LENGTH_MULTIPLIER = 16; // Discovered experimentally
    RPV.STREETVIEW_DIV_ID = 'streetviewpano';
    RPV.THREEJS_DIV_ID = 'container';
    RPV.DEG2RAD = Math.PI / 180;
    RPV.RAD2DEG = 180 / Math.PI;
    
    RPV.richPanoScenes = new Array();
    RPV.currentPanoScene = null;
    RPV.objects3Dmaterial = null;
    
    RPV.currentPanorama = null;
    RPV.texture = null; 
    RPV.material = null; // Del panorama
    RPV.mesh = null;
    
    //RPV.cameraParams = {fov: RPV.DEFAULT_FOV};
    RPV.cameraParams = {focalLength: RPV.DEFAULT_FOCAL_LENGTH};
    RPV.camera = null;    
    RPV.renderer = null;
    
    RPV.container = RPV.THREEJS_DIV; // Un div para el renderer de Three js
            
    RPV.sphere = null;
    RPV.sphereParams = {radius: 500, widthSegments: 60, heightSegments: 40};
    // Mientras esté dentro de lo que recoge la cámara
    // (param near y far especialmente) parece que value cualquier radio, como
    // era de esperar
        
    RPV.dragView = {draggingView: false, mouseDownX: 0, mouseDownY: 0};
                    
    RPV.streetViewPano = null;  // Un div para streetview               
                    
    RPV.showing = {panorama: true, modelImage: false, streetView: false, objects3D: false};
    
    RPV.load = function(showing, initialPano) {
        $(document).ready(function(){
            RPV.init(showing, initialPos);
        });
    };
  
    RPV.init = function(showing, initialPano) {
        var i;
        
        RPV.showing= $.extend(RPV.showing, showing);  
        
       
        RPV.currentPanoScene = RichPanoramaScene();        
        RPV.richPanoScenes.push(RPV.currentPanoScene);
        RPV.currentPanoScene.panoramas.push(new RichPanorama());
        RPV.currentPanorama = RPV.currentPanoScene.panoramas[0];
        
        RPV.currentPanorama.position = new THREE.Vector3(7.12, 4.78, 14,7); // POS DEL PANORAMA
        // LA ALTURA DEL PANORAMA VIENE DADA POR EL COCHE: 245,6 m. COMO EL PUNTO MÁS BAJO
        // DE LA NUBE ESTÁ A 240.82 M. (ESE ES MI CERO), LA ALTURA DEL COCHE LA PONGO
        // A 4.78 M.
        
        RPV.currentPanorama.position.y += RPV.PANO_HEIGHT;
        // SI NO VUELVO A CORREGIR LA ALTURA CON ESTE VALOR, EL SUELO NO SE PINTA A NIVEL
        // DEL SUELO CUANDO SUPERPONGO MODELO 3D Y PANORAMA...
        
        RPV.currentPanorama.heading = 66.48;           
        RPV.currentPanorama.image = 'resources/ascii_panoramas000005_flipped.jpg';
        RPV.currentPanorama.modelImage = 'resources/pov_panoramas000005.png';        
                
        RPV.container = $('#' + RPV.THREEJS_DIV_ID).get(0);
        
        if (RPV.showing.streetView) {
            //RPV.cameraParams.fov = RPV.STREETVIEW_FOV;                  
            RPV.cameraParams.focalLength = RPV.currentStreetViewFocalLength();
            RPV.initStreetView();
        }              

        
        
        // Cámara
        // Ojo, límites del frustum 1 y 1100 PUESTOS FIJOS Y A OJO
        RPV.camera = new THREE.PerspectiveCamera( 
            //RPV.cameraParams.fov,
            1, // ANYTHING, WE ARE SETTING FOCAL LENGTH IN THE NEXT INSTRUCCION AND THAT OVERRIDES THIS            
            window.innerWidth / window.innerHeight, 1, 1100 );
        RPV.camera.setLens(RPV.cameraParams.focalLength); 
         
        //RPV.camera.position = new THREE.Vector3(0,0,0);
        //RPV.camera.up = new THREE.Vector3(0,1,0);
        //RPV.camera.target = new THREE.Vector3(0,0,-1);
         
                      
        RPV.camera.position = RPV.currentPanorama.position;
                       
        // Sin esto, las rotaciones no me sirven. Son relativas a la posición de la cámara
        // así que si rota primero en X (por defecto es XYZ), el eje Y deja de apuntar al 
        // "techo" y la rotación en ese eje ya no me sirve. Si roto primero en el eje Y,
        //  la rotación en X no cambia (sigo "con los pies en el suelo") así que luego
        // puedo rotar en X lo que sea y listo.
        RPV.camera.rotation.order = 'YXZ';
        RPV.camera.rotation.x = RPV.currentPanorama.pitch * RPV.DEG2RAD;
        RPV.camera.rotation.y = -RPV.currentPanorama.heading * RPV.DEG2RAD;
        
        
        // Geometría del panorama (esfera)
        RPV.sphere = new THREE.SphereGeometry( 
            RPV.sphereParams.radius, 
            RPV.sphereParams.widthSegments,
            RPV.sphereParams.heightSegments);
        
        // LA ESCALA NEGATIVA PROVOCA UNA REFLEXIÓN: SIN ELLA EL PANORAMA
        // NO SE PINTA (AL MENOS "POR DENTRO" DE LA ESFERA)
        RPV.sphere.applyMatrix(new THREE.Matrix4().makeScale( -1, 1, 1 ));
        
        
        // Textura y material del panorama        
        RPV.texture = THREE.ImageUtils.loadTexture(
                                   RPV.currentPanorama.image);
        // Sin el repeatwrapping, el offset de la textura en lugar de rotarla en la esfera
        // la desplaza horizontalmente, dejando media esfera mal pintada
        RPV.texture.wrapS = THREE.RepeatWrapping;                        
        RPV.texture.offset.x = (270-RPV.currentPanorama.heading)/360;
         
        // ORIENTACIÓN DEL PANORAMA
        // offset.x debe ser un valor entre 0.0 y 1.0 (pos o neg), por eso divido ángulo
        // de rotación por 360
        RPV.material = new THREE.MeshBasicMaterial({
                         map: RPV.texture, opacity: 0.6, transparent: true});
        RPV.mesh = new THREE.Mesh(RPV.sphere, RPV.material);
        RPV.mesh.position = RPV.currentPanorama.position;         
        if (RPV.showing.panorama) {
            RPV.currentPanoScene.scene.add(RPV.mesh);
        }
        
        // Modelo 3d
        RPV.objects3Dmaterial = new THREE.MeshBasicMaterial( { color: 0x777700, opacity: 0.2, transparent: true} );
        if (typeof(richPanoramaMesh) !== "undefined") {
            RPV.currentPanorama.objects3DType = RPV.currentPanorama.MODEL3DTYPES.MESH;
            RPV.currentPanorama.richPanoramaMesh = richPanoramaMesh;             
            // Load mesh
            i = 0;
            var obj;
            var geoms = RPV.currentPanorama.richPanoramaMesh.geometries;
      
            for (i = 0; i < geoms.length; i++) {        
              // Necesito el clone para que cada objeto tenga su propio material
              // si quiero que sean independientes para poder cambiarles colores
              // en una selección o algo así
              obj = new THREE.Mesh(geoms[i], RPV.objects3Dmaterial.clone());
              obj.receiveShadow = true;
              obj.castShadow = true;
              //RPV.currentPanoScene.scene.add(obj); // EN VERSIÓN FINAL NO LO AÑADO A LA ESCENA, EN REALIDAD NO LO QUIERO PINTAR
                            
              // Por ahora trabajo con una sola escena por visualizador. En un visualizador
              // realista esto no será así.
              RPV.currentPanoScene.sceneObjects.push(obj);
            }
                    
        } else if (typeof(richPanoramaGrid) !== "undefined") {
            RPV.currentPanorama.objects3DType = RPV.currentPanorama.MODEL3DTYPES.GRID;
            RPV.currentPanorama.richPanoramaGrid = richPanoramaGrid;
            
            // LOAD GRID
            var cellPositions = RPV.currentPanorama.richPanoramaGrid.cellPositions;
            var cellSizes = RPV.currentPanorama.richPanoramaGrid.cellSizes;



            i = 0;
            var mat;
            var cellpos;
            var cell;
            for (i = 0; i < cellPositions.length; i++) {     
                mat = RPV.objects3Dmaterial.clone();
                if (RPV.showing.objects3D) {
                    mat.visible = true; // FALSE SI SOLO QUIERO EL OBJETI PARA CALCULAR INTERSECCIÓN
                    // TRUE SI QUIERO VERLO. USO ESTO PORQUE SI NO AÑADES UN OBJETO A UNA ESCENA
                    // RAYCASTER NO FUNCIONA PARA LAS INTERSECCIONES
                } else {
                    mat.visible = false;
                }
                cell = new THREE.Mesh(RPV.currentPanorama.richPanoramaGrid.cellGeometry, mat);
                //cell.receiveShadow = true;
                //cell.castShadow = true;   
                cell.position.x =  cellPositions[i].x;
                cell.position.y =  cellPositions[i].y;
                cell.position.z =  cellPositions[i].z;        
        
                if (!RPV.currentPanorama.richPanoramaGrid.uniformSizeCells) {
                    cell.scale.x = cellSizes[i].x;
                    cell.scale.y = cellSizes[i].y;
                    cell.scale.z = cellSizes[i].z;
                }
                RPV.currentPanoScene.scene.add(cell); 
                // Por ahora trabajo con una sola escena por visualizador. En un visualizador
                // realista esto no será así.
                RPV.currentPanoScene.sceneObjects.push(cell);                
            };
        }
        
        
        RPV.renderer = new THREE.WebGLRenderer({antialias: true});
        RPV.renderer.setSize(window.innerWidth, window.innerHeight);
        RPV.renderer.setClearColor(0x000000, 0); // TRANSPARENT BACKGROUND
        RPV.container.appendChild(RPV.renderer.domElement);
        
        RPV.attachEventHandlers();
        
        RPV.animate();
        
    };
    
    RPV.initStreetView = function() {                    
        RPV.streetViewPano = new google.maps.StreetViewPanorama($('#'+RPV.STREETVIEW_DIV_ID).get(0),
                             {disableDefaultUI: true});
                             
        // DE MOMENTO FIJADO PARA PANORAMA 5 DEL ACTUR        
        var pano5Pos = new google.maps.LatLng(41.66602668,-0.89033847);                
        var myPOV = {heading:RPV.currentPanorama.heading, pitch:RPV.currentPanorama.pitch, zoom:1};        
        RPV.streetViewPano.setPosition(pano5Pos);
        RPV.streetViewPano.setPov(myPOV);
        //console.log("NOT REAL street view pos: " + RPV.streetViewPano.getPosition().lat() +","+
        //                                       RPV.streetViewPano.getPosition().lng());    

        function processSVData(data, status) {
           if (status == google.maps.StreetViewStatus.OK) {
               //console.log("REAL street view pos: " + data.location.latLng.lat() +","+
               //                                data.location.latLng.lng());
               // AQUÍ HAY QUE ACTUALIZAR LA POSICIÓN DE LA CÁMARA A
               // LA QUE NOS DEVUELVE data.location.latLng
               // PRIMERO HABRÁ QUE TRADUCIRLA AL SISTEMA DE COORDENADAS QUE
               // USEN LOS DATOS 3D QUE SUPERPONEMOS    
           }          
        }

        var sv = new google.maps.StreetViewService();
        // With a radius of 50 or less, this call returns information
        // about the closest streetview panorama to the given position.
        // In the callback function processSVData, the data
        // parameter can give us the TRUE position of the panorama.
        // This is necessary because the StreetViewPanorama object position
        // is the one we give to it, no the TRUE position of that panorama.
        sv.getPanoramaByLocation(pano5Pos, 50, processSVData);                                  
    };
    
    RPV.updateStreetView = function() {                    
        var myPOV = {heading: RPV.currentHeading(), 
                     pitch:RPV.currentPitch(), zoom:1};
                     
        console.log("myPOV heading and pitch: " + myPOV.heading+","+myPOV.pitch);
                
        RPV.streetViewPano.setPov(myPOV);
    };      
    
    // Returns a focal length "compatible" with a Google Street View background
    // given the current size of the window
    RPV.currentStreetViewFocalLength = function() {
        if (window.innerWidth > 0) {
            return RPV.STREETVIEW_FOCAL_LENGTH_MULTIPLIER * window.innerWidth / window.innerHeight;
        } else {
            // Just in case innerWidth is 0. If that happens, it does not matter which
            // focal length we return, because nothing will be shown
            return RPV.DEFAULT_FOCAL_LENGTH;
        }
    };
    
    RPV.currentHeading = function() {
      return -(RPV.camera.rotation.y * RPV.RAD2DEG);    
    };
    
    RPV.currentPitch = function() {
      return RPV.camera.rotation.x * RPV.RAD2DEG;    
    };
    
    
    RPV.attachEventHandlers = function() {    
        // click event does not get right click in Chromium; mousedown gets left
        // and right clicks properly in both Firefox and Chromium
      
        function onMouseWheel(event) {
            event.preventDefault();           
            event.stopPropagation();
            
            // Requieres jQuery Mousewheel plugin
            // provides: event.deltaX, event.deltaY and event.deltaFactor
            //RPV.cameraParams.fov -= event.deltaY * 2.5;
            //console.log("FOV " + RPV.cameraParams.fov);
            //RPV.camera.projectionMatrix.makePerspective( RPV.cameraParams.fov, 
            //    window.innerWidth / window.innerHeight, 1, 1100 );
                
            RPV.cameraParams.focalLength += event.deltaY;
            console.log("FOCAL_LENGTH " + RPV.cameraParams.focalLength);
            RPV.camera.setLens(RPV.cameraParams.focalLength);
            RPV.camera.updateProjectionMatrix();
            
            RPV.render();
        };  
        
        function onMouseDown(event) {
            event.preventDefault();           
            event.stopPropagation();
                
            RPV.dragView.draggingView = true;

            RPV.dragView.mouseDownX = event.clientX;
            RPV.dragView.mouseDownY = event.clientY;                
                               
                
            // PARA SELECCIONAR ELEMENTOS POR RAYCASTING (SIN REVISAR AÚN)
            /*var intersects = intersect(event.clientX, event.clientY);
            if ( intersects.length > 0 ) {
                console.log("Scene object intersected");
                intersects[ 0 ].object.material.color.setHex( Math.random() * 0xffffff );
                intersects[ 0 ].object.material.visible = true;*/
                    

                /*var particle = new THREE.Sprite( particleMaterial );
                particle.position = intersects[ 0 ].point;
                console.log("PUNTO INTERESECCIÓN: "+intersects[ 0 ].point.x, 
                       intersects[ 0 ].point.y, intersects[ 0 ].point.z );
                particle.scale.x = particle.scale.y = 8;
                scene.add( particle ); // Mostrar punto de intersección*/
                //scene.remove(intersects[0].object); // Eliminar objeto (no se si funciona bien)
            //}  
        };
        
        function onMouseUp(event) {
            event.preventDefault();           
            event.stopPropagation();
            RPV.dragView.draggingView = false;
        };
        
        function onMouseMove(event) {
            event.preventDefault();           
            event.stopPropagation();
            
            var horizontalMovement, verticalMovement;     
            
            var aspect = window.innerWidth / window.innerHeight;
            // horizontal FOV. Formula from <https://github.com/mrdoob/three.js/issues/1239>            
            var hFOV = 2 * Math.atan( Math.tan( (RPV.camera.fov * RPV.DEG2RAD) / 2 ) * aspect );
            
            if (RPV.dragView.draggingView) {
                horizontalMovement = RPV.dragView.mouseDownX  - event.clientX;
                verticalMovement  = RPV.dragView.mouseDownY  - event.clientY;
                
                // El /N es a ojo, no termino de ver por qué hace falta si los otros parámetros son correctos...                
                RPV.camera.rotation.y = (RPV.camera.rotation.y - ((horizontalMovement/4) * hFOV / window.innerWidth)) % (2 * Math.PI);                
                RPV.camera.rotation.x = RPV.camera.rotation.x + ((verticalMovement/4) *  (RPV.camera.fov * RPV.DEG2RAD) / window.innerHeight);
                RPV.camera.rotation.x = Math.max(-Math.PI/2, Math.min( Math.PI/2, RPV.camera.rotation.x));                
                
                console.log("rotation.y "+ RPV.camera.rotation.y);
                
                RPV.updateStreetView();
            }
        };
        
        function onWindowResize() {
            RPV.camera.aspect = window.innerWidth / window.innerHeight;
            if (RPV.showing.streetView) {
              RPV.cameraParams.focalLength = RPV.currentStreetViewFocalLength();
              RPV.camera.setLens(RPV.cameraParams.focalLength);    
            }                                    
            RPV.camera.updateProjectionMatrix();
            RPV.renderer.setSize( window.innerWidth, window.innerHeight );
            
            
            console.log("FOCAL_LENGTH: " + RPV.cameraParams.focalLength);
            console.log("Aspect ratio = " + window.innerWidth + "/" + window.innerHeight);
        };
      
        $(document).mousewheel(onMouseWheel);
        $(document).mousedown(onMouseDown);
        $(document).mouseup(onMouseUp);
        $(document).mousemove(onMouseMove);
        $(window).resize(onWindowResize);
        
    };
    
    
    
 
    RPV.animate = function() {
        requestAnimationFrame(RPV.animate);
        RPV.render();
    };

    RPV.render = function() {        
        //RPV.setCameraTargetFromLatLon();
        //RPV.camera.lookAt( RPV.camera.target );
        RPV.renderer.render(RPV.currentPanoScene.scene, RPV.camera );
    };
    
    /*RPV.setCameraTargetFromLatLon = function() {
        RPV.lat = Math.max( - 85, Math.min( 85, RPV.lat ) );
        var phi = THREE.Math.degToRad( 90 - RPV.lat );
        var theta = THREE.Math.degToRad( RPV.lon );

        RPV.camera.target.x = RPV.sphereParams.radius * Math.sin( phi ) * Math.cos( theta );
        RPV.camera.target.y = RPV.sphereParams.radius * Math.cos( phi );
        RPV.camera.target.z = RPV.sphereParams.radius * Math.sin( phi ) * Math.sin( theta );    
    };*/

    return RPV;
};

//var richPanoViewer = RichPanoViewer();