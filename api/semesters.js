const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { branch } = req.query;
  if (!branch) {
    return res.status(400).json({ error: 'Branch parameter required' });
  }

  try {
    const { data, error } = await supabase
      .from('files')
      .select('semester')
      .eq('branch', branch)
      .eq('status', 'approved')
      .order('semester');

    if (error) throw error;

    const semesters = [...new Set(data.map(item => item.semester))];
    res.status(200).json(semesters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}