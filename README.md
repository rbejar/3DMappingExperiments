# 3DMappingExperiments

Different tests and experiments related to 3D Mapping.

## OpenStreetMap isometric tiled map of Zaragoza

This is just a quick-and-dirty test. I have extracted data from [OpenStreetMap](http://www.openstreetmap.org) for Zaragoza, transformed them to a POV-Ray file (isometric view, 45 degrees camera angle, from the South), rendered this file, tiled the result and set up a simple map client. The whole process is explained in the next section. Known problems:
- The buildings which are not shown (or look "flat") in the map is because they have not been traced in OpenStreetMap: you have the roads, you have the parcels, but the buildings themselves have not been created. The heights of the buildings are not well either; the source data does not have the right heights for most buildings in Zaragoza.
- The "graphic style" is pretty basic. A little work with the textures used in POV-Ray would improve the final result.
- The ground is patchy and it does not look very good. Overlapping the OpenStreetMap on a DEM with a proper texture (e.g. an ortophotography or a nice looking map) would improve the result.
- I have created only three zoom levels (14,15,16).

You can see it working at <http://rbejar.github.io/3DMappingExperiments/ZGZ-IsometricMap/index.html>.

Other people have set up other examples with OpenStreetMap and similar approaches (with more work, better looking and using different tools). I have taken inspiration and some ideas from them: <http://maps.osm2world.org/> and <http://osm.kyblsoft.cz/3dmapa/>.

### Process

1. Download OSM data for your area of interest. <http://extract.bbbike.org/> allows you to select yours. I have chosen OSM (XML) compressed as gzip. Uncompress once downloaded.
    - PBF seems a better choice for format (smaller download), but I have had some problems with it. 

1. Use [OSM2World](http://osm2world.org/) to transform from OSM to POV-Ray format. We want an ortographic perspective with a 45 degrees angle (isometric view). For instance, for Zaragoza, level 15 of zoom: `$./osm2world.sh --input planet_ZGZ-1.023,41.598_-0.801,41.698.osm --output planetZGZ45S_L15.pov --oview.tiles 15,16290,12200 15,16311,12213 --oview.angle 45`
    - If you choose a 45 angle (looks "more 3D"), then your tiles will have 2 to 1 aspect ratio,
    so the aspect ratio of your final image will have to be 2 * num_of_horizontal_tiles / num_of_vertical_tiles. An angle of 30 allows to have 1 to 1 aspect ratio, what may prove itself useful when integrating other layers for instance, but it looks "less 3D".
    - By default the view is from the South. You can change it adding the parameter `--oview.from` and choosing N,S,E or W.
    - This program gives lots of exceptions, and many times it just fails. I think it is because when you extract data for a given bounding box, some geometries are "broken" and they cause problems. There are a number of parameters of the osm2world application that could help with this. For now, I have tried downloading different, very similar, bounding boxes until I have found one that works.

1. To know which tiles correspond to your area of interest, you can go to <http://oms.wff.ch/calc.php?baseurl=cylce&lat=41.698&long=-1.023&longto=-0.801&latto=41.598>. A little warning: do not fill in the two pairs of coordinates corresponding to your bounding box. Put one corner, write down the tiles and then put the other corner and write down the tiles.
    - If you prefer so, you have programs in many programming languages which make the calculation <http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames>.

1. Use POV-Ray to render the image. In level 15 for the area chosen for Zaragoza there are 22x14 tiles. If the aspect ratio is 2/1 (45 degrees) then we need to render an image of 22*256=5632 pixels wide and 14*128=1792 pixels height: `$povray +W5632 +H1792 +B100 -D +A +IplanetZGZ45S_L15 +OZGZ45S_L15.png`
    - Make sure you have the file osm2world_definitions.inc by your pov file. You can find it in the resources folder for OSM2World. 
    
1. To tile that image into 256x128 images with a "right" name, you can use image magick: `$convert ZGZ45S_L15.png -crop 256x128 -set filename:tile "%[fx:page.x/256+16290]_%[fx:page.y/128+12200]" +adjoin "15/map_%[filename:tile].png"`
    - If non-square tiles are a problem (because your map client does not support them, or whatever) you can tile them as squares with image magick: `$convert ZGZ45S_L15.png -crop 256x256 -set filename:tile "%[fx:page.x/256+16290]_%[fx:page.y/256+12200]" +adjoin "15/map_%[filename:tile].png`
    - This works because once you have created the image with the proper aspect ratio in POV-Ray, you can tile it as you please
    
1. You can create other levels with the same pov file you created before. The level of detail will be fine (the pov file has all the information and detail the OSM map has); you may have a little too much "margin" and you will have to render a large image for the higher levels, but POV-Ray can create pretty large images without big problems. Important: create always the same tiles: if you leave some tiles out, the maps will not zoom properly (you will zoom on one place, the map will show another). For instance, if you start in level 15 with the tile 16290 in horizontal, in level 16 you must start with the tile 32580.
   

### Credits and references

The data used is by "© OpenStreetMap contributors". These data are available under the Open Database License. You can read further information at the [OpenStreetMap copyright page](http://www.openstreetmap.org/copyright/). 

You can read more about the software used to process OpenStreetMap data (including information about licenses) at <http://wiki.openstreetmap.org/wiki/Software>.

The map client is based on [Leaflet](http://leafletjs.com/).
Copyright (c) 2010-2013, Vladimir Agafonkin
Copyright (c) 2010-2011, CloudMade
All rights reserved.