const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('files')
      .select('branch')
      .eq('status', 'approved')
      .order('branch');

    if (error) throw error;

    const branches = [...new Set(data.map(item => item.branch))];
    res.status(200).json(branches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}