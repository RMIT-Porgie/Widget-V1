import geojson from "../assets/sundial_orchard_object_V2.geojson";

export function createTreeCoordinates(add3dpoi) {
    geojson.features.forEach((feature) => {
        const guid = feature.properties["GUID"]; // Assuming GUID is the unique identifier
        const soilMoisture = feature.properties["Soil Moisture"];
        const geometry = feature.geometry;

        const treeCoordinate = {
            id: guid,
            geojson: {
                type: "Feature",
                properties: { "Soil Moisture": soilMoisture },
                geometry: geometry,
            },
            layer: {
                id: `tree-layer-${guid}`,
                name: `Tree POI ${guid}`,
                attributeMapping: {
                    "STRID": "GUID",
                    "Soil Moisture": "Soil Moisture",
                },
            },
            render: {
                anchor: true,
                color: "green",
                scale: [1, 1, 3],
                shape: "tube",
                switchDistance: 500,
                opacity: 1,
            },
        };

        add3dpoi(treeCoordinate);
    });
}
