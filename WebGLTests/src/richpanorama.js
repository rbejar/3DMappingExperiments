/**
    richpanorama.js - Rich Panorama Visualization
    Copyright (C) 2013 Rubén Béjar {http://www.rubenbejar.com/}
 */

function RichPanorama() {
    var RP = {};
  
    function privateFunction() {
    };
  
    var privateAttribute = 0;
    
    RP.MODEL3DTYPES = {MESH: 1, GRID: 2};
  
    RP.position = new THREE.Vector3(0,0,0);
    RP.heading = 0; // AKA yaw. Where do I look (north, south,...)
    RP.pitch = 0; // I look "more up", or "more down"
    // I have not a roll parameter: I assume I never lean the camera like that...
    RP.image = '';
    RP.modelImage = ''; // Image that "mixes" 3d model and panorama
    
    
    RP.objects3DType = null; // Must be one of MODEL3DTYPES
    RP.richPanoramaMesh = null;
    RP.richPanoramaGrid = null;
    
    var material = new THREE.MeshBasicMaterial( { color: 0x777700, opacity: 0.1, transparent: true} );
    
      
    
  
    RP.aFunction = function() {          
    };



    return RP;
};

function RichPanoramaScene() {
    var RPS = {};
    
    RPS.scene = new THREE.Scene();
    RPS.sceneObjects = new Array();        
    RPS.panoramas = new Array();    

    return RPS;
};

//var richPanorama = RichPanorama();
//var richPanoramaScene = RichPanoramaScene();
