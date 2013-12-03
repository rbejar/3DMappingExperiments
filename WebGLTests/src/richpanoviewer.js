/**
    richpanoviewer.js - Rich Panorama Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function RichPanoViewer() {
    var RPV = {};    
    
    RPV.PANO_HEIGHT = 4; // I need this to see the ground 3d data 
    // on the ground. Still not sure about how to calculate it, for now it is
    // trial and error
    
    RPV.richPanoScenes = new Array();
    RPV.currentPanoScene = null;
    RPV.objects3Dmaterial = null;
    
    RPV.currentPanorama = null;
    RPV.texture = null; 
    RPV.material = null; // Del panorama
    RPV.mesh = null;
    
    RPV.cameraParams = {fov: 70};
    RPV.camera = null;    
    RPV.renderer = null;
    
    RPV.container = null; // Un div para la página
            
    RPV.sphere = null;
    RPV.sphereParams = {radius: 500, widthSegments: 60, heightSegments: 40};
    // Mientras esté dentro de lo que recoge la cámara
    // (param near y far especialmente) parece que value cualquier radio, como
    // era de esperar
    
    // lon and lat used to determine where are we looking at
    RPV.lon = 0;
    RPV.lat = 0;
    
    RPV.dragView = {draggingView: false, mouseDownX: 0, mouseDownY: 0, 
                    mouseDownLon: 0, mouseDownLat: 0};
    
    RPV.load = function() {
        $(document).ready(function(){
            RPV.init();
        });
    };
  
    RPV.init = function() {
        var i;
        
        RPV.currentPanoScene = RichPanoramaScene();        
        RPV.richPanoScenes.push(RPV.currentPanoScene);
        RPV.currentPanoScene.panoramas.push(new RichPanorama());
        RPV.currentPanorama = RPV.currentPanoScene.panoramas[0];
        
        RPV.currentPanorama.position = new THREE.Vector3(7.12, 4.78, 14,7); // POS DEL PANORAMA
        // LA ALTURA DEL PANORAMA VIENE DADA POR EL COCHE: 245,6 m. COMO EL PUNTO MÁS BAJO
        // DE LA NUBE ESTÁ A 240.82 M. (ESE ES MI CERO), LA ALTURA DEL COCHE LA PONGO
        // A 4.78 M.
        
        RPV.currentPanorama.position.y += RPV.PANO_HEIGHT;
        
        RPV.currentPanorama.rotation = 66.48;    
        RPV.currentPanorama.image = 'resources/ascii_panoramas000005_flipped.jpg';
        RPV.currentPanorama.modelImage = 'resources/pov_panoramas000005.png';
        
        
        RPV.container = document.getElementById( 'container' );
        
        
        // Cámara
                // Ojo, límites del frustum 1 y 1100 PUESTOS FIJOS Y A OJO
        RPV.camera = new THREE.PerspectiveCamera( 
            RPV.cameraParams.fov, 
            window.innerWidth / window.innerHeight, 1, 1100 );
                      
        RPV.camera.position = RPV.currentPanorama.position;
        RPV.camera.target = new THREE.Vector3(0,0,0); // El valor inicial da 
        // un poco igual cual, creo, pero si que hace falta que exista un target

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
        RPV.texture.offset.x = (270-RPV.currentPanorama.rotation)/360; 
        // ORIENTACIÓN DEL PANORAMA
        // offset.x debe ser un valor entre 0.0 y 1.0 (pos o neg), por eso divido ángulo
        // de rotación por 360
        RPV.material = new THREE.MeshBasicMaterial({
                         map: RPV.texture});
        RPV.mesh = new THREE.Mesh(RPV.sphere, RPV.material);
        RPV.mesh.position = RPV.currentPanorama.position;         
        RPV.currentPanoScene.scene.add(RPV.mesh);
        
        // Modelo 3d
        RPV.objects3Dmaterial = new THREE.MeshBasicMaterial( { color: 0x777700, opacity: 0.1, transparent: true} );
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
                mat.visible = false; // FALSE SI SOLO QUIERO EL OBJETI PARA CALCULAR INTERSECCIÓN
                // TRUE SI QUIERO VERLO. USO ESTO PORQUE SI NO AÑADES UN OBJETO A UNA ESCENA
                // RAYCASTER NO FUNCIONA PARA LAS INTERSECCIONES
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
        
        
        RPV.renderer = new THREE.WebGLRenderer();
        RPV.renderer.setSize(window.innerWidth, window.innerHeight);
        RPV.container.appendChild(RPV.renderer.domElement);
        
        RPV.attachEventHandlers();
        
        RPV.animate();
       
    };
    
    
    RPV.attachEventHandlers = function() {    
        // click event does not get right click in Chromium; mousedown gets left
        // and right clicks properly in both Firefox and Chromium
      
        function onMouseWheel(event) {
            console.log("deltaY "+event.deltaY);
            console.log("deltafactor "+event.deltaFactor);            
            // Requieres jQuery Mousewheel plugin
            // provides: event.deltaX, event.deltaY and event.deltaFactor
            RPV.cameraParams.fov -= event.deltaY * 2.5;
            RPV.camera.projectionMatrix.makePerspective( RPV.cameraParams.fov, 
                window.innerWidth / window.innerHeight, 1, 1100 );
            RPV.render();
        };  
        
        function onMouseDown(event) {
            event.preventDefault();           
            event.stopPropagation();
                
            RPV.dragView.draggingView = true;

            RPV.dragView.mouseDownX = event.clientX;
            RPV.dragView.mouseDownY = event.clientY;                

            RPV.dragView.mouseDownLon = RPV.lon;
            RPV.dragView.mouseDownLat = RPV.lat;
                               
                
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
            
            if (RPV.dragView.draggingView) {
                RPV.lon = ( RPV.dragView.mouseDownX  - event.clientX ) * 0.1 + RPV.dragView.mouseDownLon;
                RPV.lat = ( event.clientY -RPV.dragView.mouseDownY  ) * 0.1 + RPV.dragView.mouseDownLat;
            }
        };
      
        $(document).mousewheel(onMouseWheel);
        $(document).mousedown(onMouseDown);
        $(document).mouseup(onMouseUp);
        $(document).mousemove(onMouseMove);
        
    };
    
    
    
 
    RPV.animate = function() {
        requestAnimationFrame(RPV.animate);
        RPV.render();
    };

    RPV.render = function() {
        RPV.lat = Math.max( - 85, Math.min( 85, RPV.lat ) );
        var phi = THREE.Math.degToRad( 90 - RPV.lat );
        var theta = THREE.Math.degToRad( RPV.lon );

        RPV.camera.target.x = RPV.sphereParams.radius * Math.sin( phi ) * Math.cos( theta );
        RPV.camera.target.y = RPV.sphereParams.radius * Math.cos( phi );
        RPV.camera.target.z = RPV.sphereParams.radius * Math.sin( phi ) * Math.sin( theta );

        RPV.camera.lookAt( RPV.camera.target );

                /*
                // distortion
                camera.position.x = - camera.target.x;
                camera.position.y = - camera.target.y;
                camera.position.z = - camera.target.z;
                */

        RPV.renderer.render(RPV.currentPanoScene.scene, RPV.camera );
    };

    return RPV;
};

//var richPanoViewer = RichPanoViewer();