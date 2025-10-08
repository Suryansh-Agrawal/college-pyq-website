const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const express = require('express');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Note: In Vercel, multer might not work directly; consider using form-data parsing
  // For simplicity, assuming client-side upload to Supabase

  const { branch, semester, subject, type, files } = req.body;

  if (!branch || !semester || !subject || !type || !files) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    for (const file of files) {
      const filePath = `${branch}/${semester}/${subject}/${type}/${file.name}`;
      const { data, error } = await supabase.storage
        .from('pdfs')
        .upload(filePath, file.buffer, { contentType: 'application/pdf' });

      if (error) throw error;

      const { error: insertError } = await supabase
        .from('files')
        .insert({
          filename: file.name,
          branch,
          semester,
          subject,
          type,
          status: 'pending',
          upload_date: new Date().toISOString()
        });

      if (insertError) throw insertError;
    }

    res.status(200).json({ message: 'Upload successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}