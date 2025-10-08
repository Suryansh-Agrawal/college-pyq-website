const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { branch, semester } = req.query;
  if (!branch || !semester) {
    return res.status(400).json({ error: 'Branch and semester parameters required' });
  }

  try {
    const { data, error } = await supabase
      .from('files')
      .select('subject')
      .eq('branch', branch)
      .eq('semester', semester)
      .eq('status', 'approved')
      .order('subject');

    if (error) throw error;

    const subjects = [...new Set(data.map(item => item.subject))];
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}