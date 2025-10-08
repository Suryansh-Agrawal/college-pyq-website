const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { branch, semester, subject } = req.query;
  if (!branch || !semester || !subject) {
    return res.status(400).json({ error: 'Branch, semester, and subject parameters required' });
  }

  try {
    const { data, error } = await supabase
      .from('files')
      .select('type')
      .eq('branch', branch)
      .eq('semester', semester)
      .eq('subject', subject)
      .eq('status', 'approved')
      .order('type');

    if (error) throw error;

    const types = [...new Set(data.map(item => item.type))];
    res.status(200).json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}