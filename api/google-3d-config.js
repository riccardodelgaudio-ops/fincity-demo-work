export default function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const key=process.env.GOOGLE_MAPS_API_KEY||process.env.GOOGLE_MAP_TILES_API_KEY||'';
  res.status(200).json({key});
}