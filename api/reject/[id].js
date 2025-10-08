const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const jwtSecret = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  try {
    jwt.verify(token, jwtSecret);
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { id } = req.query;

  try {
    // Update status to rejected
    const { error } = await supabase
      .from('files')
      .update({ status: 'rejected' })
      .eq('id', id);

    if (error) throw error;

    // Optionally delete file from storage
    const { data: fileData } = await supabase
      .from('files')
      .select('branch, semester, subject, type, filename')
      .eq('id', id)
      .single();

    if (fileData) {
      const filePath = `${fileData.branch}/${fileData.semester}/${fileData.subject}/${fileData.type}/${fileData.filename}`;
      await supabase.storage.from('pdfs').remove([filePath]);
    }

    res.status(200).json({ message: 'File rejected' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}