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
  const { newType } = req.body;

  if (!newType || !['PYQ', 'CT', 'Notes'].includes(newType)) {
    return res.status(400).json({ error: 'Invalid new type' });
  }

  try {
    // Get current file data
    const { data: fileData, error: selectError } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .single();

    if (selectError) throw selectError;

    if (fileData.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved files can be moved' });
    }

    const oldPath = `${fileData.branch}/${fileData.semester}/${fileData.subject}/${fileData.type}/${fileData.filename}`;
    const newPath = `${fileData.branch}/${fileData.semester}/${fileData.subject}/${newType}/${fileData.filename}`;

    // Move file in storage
    const { data: moveData, error: moveError } = await supabase.storage
      .from('pdfs')
      .move(oldPath, newPath);

    if (moveError) throw moveError;

    // Update DB
    const { error: updateError } = await supabase
      .from('files')
      .update({ type: newType })
      .eq('id', id);

    if (updateError) throw updateError;

    res.status(200).json({ message: 'File moved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}