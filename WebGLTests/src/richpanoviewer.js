/**
    richpanoviewer.js - Rich Panorama Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function RichPanoViewer() {
    var RPV = {};
    
    function privateFunction() {
        
    };
    var privateAttribute = 0;
    
    RPV.PANO_HEIGHT = 4; // I need this to see the ground 3d data 
    // on the ground. Still not sure about how to calculate it, for now it is
    // trial and error
    
    RPV.panorama = RichPanorama();
    RPV.texture = null; 
    RPV.material = null;
    RPV.mesh = null;
    
    RPV.cameraParams = {fov: 70};
    RPV.camera = null;
    RPV.scene = null;
    RPV.renderer = null;
    
    RPV.container = null; // Un div para la página
            
    RPV.sphere = null;
    RPV.sphereParams = {radius: 500, widthSegments: 60, heightSegments: 40};
    // Mientras esté dentro de lo que recoge la cámara
    // (param near y far especialmente) parece que value cualquier radio, como
    // era de esperar
    
  
    RPV.init = function() {
        RPV.panorama.position = new THREE.Vector3(7.12, 4.78, 14,7); // POS DEL PANORAMA
        // LA ALTURA DEL PANORAMA VIENE DADA POR EL COCHE: 245,6 m. COMO EL PUNTO MÁS BAJO
        // DE LA NUBE ESTÁ A 240.82 M. (ESE ES MI CERO), LA ALTURA DEL COCHE LA PONGO
        // A 4.78 M.
        
        RPV.panorama.position.y += PANO_HEIGHT;
        
        RPV.panorama.rotation = 66.48;    
        RPV.panorama.image = 'resources/ascii_panoramas000005_flipped.jpg';
        RPV.panorama.modelImage = 'resources/pov_panoramas000005.png';
        
        
        RPV.container = document.getElementById( 'container' );
        
        
        // Cámara
                // Ojo, límites del frustum 1 y 1100 PUESTOS FIJOS Y A OJO
        RPV.camera = new THREE.PerspectiveCamera( 
            RPV.cameraParams.fov, 
            window.innerWidth / window.innerHeight, 1, 1100 );
                      
        RPV.camera.position = RPV.panorama.position;
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
                                   RPV.panorama.image);
        // Sin el repeatwrapping, el offset de la textura en lugar de rotarla en la esfera
        // la desplaza horizontalmente, dejando media esfera mal pintada
        RPV.texture = THREE.RepeatWrapping;                        
        RPV.texture.offset.x = (270-RPV.panorama.rotation)/360; 
        // ORIENTACIÓN DEL PANORAMA
        // offset.x debe ser un valor entre 0.0 y 1.0 (pos o neg), por eso divido ángulo
        // de rotación por 360
        RPV.material = new THREE.MeshBasicMaterial({
                         map: RPV.texture});
        RPV.mesh = new THREE.Mesh(RPV.sphere, RPV.material);
        RPV.mesh.position = RPV.panorama.position; 
                 
                
        RPV.scene = new THREE.Scene();
        RPV.scene.add(RPV.mesh);
        
        
        RPV.renderer = new THREE.WebGLRenderer();
        RPV.renderer.setSize(window.innerWidth, window.innerHeight);
        RPV.container.appendChild(RPV.renderer.domElement );
        
        
       
    };

    return RPV;
};

//var richPanoViewer = RichPanoViewer();