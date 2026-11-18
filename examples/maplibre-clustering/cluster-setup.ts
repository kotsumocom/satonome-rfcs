import maplibregl from 'maplibre-gl';

/**
 * サトノメ 地図クラスタリング設定
 * RFC-002: 地図マーカークラスタリング
 *
 * MapLibre GL JS ネイティブクラスタリングを使用して、
 * 鳥獣被害レポートを効率的に表示する。
 *
 * @license MIT
 * @see https://github.com/kotsumocom/satonome-rfcs/blob/main/rfcs/002-map-clustering.md
 */

// 動物種ごとのマーカー色
const ANIMAL_COLORS: Record<string, string> = {
  DEER: '#ef4444', // red
  BOAR: '#f97316', // orange
  MONK: '#a855f7', // purple
  BRBR: '#6b7280', // gray
  BWBR: '#374151', // dark gray
  CROW: '#1f2937', // near black
  OTHR: '#3b82f6', // blue
};

// クラスタサイズに応じた色とサイズ
const CLUSTER_STEPS = [
  { threshold: 100, color: '#ef4444', radius: 30 },
  { threshold: 50, color: '#f97316', radius: 25 },
  { threshold: 10, color: '#eab308', radius: 20 },
  { threshold: 0, color: '#22c55e', radius: 15 },
];

interface ReportGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
    properties: {
      id: string;
      animal_code: string;
      report_type: string;
      reported_at: string;
      status: string;
    };
  }>;
}

/**
 * クラスタリングソースとレイヤーを地図に追加する
 */
export function setupClusterLayers(
  map: maplibregl.Map,
  data: ReportGeoJSON,
): void {
  // --- Source ---
  map.addSource('reports', {
    type: 'geojson',
    data,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 50,
    clusterProperties: {
      // 動物種ごとの集計
      deer_count: ['+', ['case', ['==', ['get', 'animal_code'], 'DEER'], 1, 0]],
      boar_count: ['+', ['case', ['==', ['get', 'animal_code'], 'BOAR'], 1, 0]],
    },
  });

  // --- Layer 1: クラスター円 ---
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'reports',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        CLUSTER_STEPS[3].color,
        10,
        CLUSTER_STEPS[2].color,
        50,
        CLUSTER_STEPS[1].color,
        100,
        CLUSTER_STEPS[0].color,
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        CLUSTER_STEPS[3].radius,
        10,
        CLUSTER_STEPS[2].radius,
        50,
        CLUSTER_STEPS[1].radius,
        100,
        CLUSTER_STEPS[0].radius,
      ],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // --- Layer 2: クラスターラベル ---
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'reports',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-font': ['Noto Sans CJK JP Bold'],
      'text-size': 12,
    },
    paint: {
      'text-color': '#ffffff',
    },
  });

  // --- Layer 3: 非クラスターポイント ---
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'reports',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'match',
        ['get', 'animal_code'],
        'DEER', ANIMAL_COLORS.DEER,
        'BOAR', ANIMAL_COLORS.BOAR,
        'MONK', ANIMAL_COLORS.MONK,
        'BRBR', ANIMAL_COLORS.BRBR,
        'BWBR', ANIMAL_COLORS.BWBR,
        'CROW', ANIMAL_COLORS.CROW,
        ANIMAL_COLORS.OTHR,
      ],
      'circle-radius': 8,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
    },
  });

  // --- クリックイベント: クラスター展開 ---
  map.on('click', 'clusters', async (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['clusters'],
    });
    if (!features.length) return;

    const clusterId = features[0].properties?.cluster_id;
    const source = map.getSource('reports') as maplibregl.GeoJSONSource;

    const zoom = await source.getClusterExpansionZoom(clusterId);
    const geometry = features[0].geometry as GeoJSON.Point;

    map.easeTo({
      center: geometry.coordinates as [number, number],
      zoom,
    });
  });

  // --- カーソル変更 ---
  map.on('mouseenter', 'clusters', () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', 'clusters', () => {
    map.getCanvas().style.cursor = '';
  });
}
