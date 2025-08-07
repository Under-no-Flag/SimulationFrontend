// 服务端接口管理

export async function fetchPedestrianData(runId, simTime) {
  const url = `http://localhost:9527/api/data/pedestrians/${runId}/simtime/${simTime}`;
  const res = await fetch(url);
  return res.json();
}
