
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const env = {};
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(l => {
        const [k, v] = l.split('=');
        if (k && v) env[k.trim()] = v.trim().replace(/^"(.*)"$/, '$1');
    });
} catch (e) { }

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function applySetup() {
    const fileName = process.argv[2];
    if (!fileName) {
        console.error('Please provide a SQL file name as an argument.');
        process.exit(1);
    }

    try {
        console.log(`Reading SQL file: ${fileName}...`);
        const sql = fs.readFileSync(fileName, 'utf8');

        console.log('Executing SQL via execute_sql RPC...');
        const { data, error } = await supabase.rpc('execute_sql', { sql });

        if (error) {
            console.error('RPC Error:', error);
            if (error.message.includes('function "execute_sql" does not exist')) {
                console.log('\nCRITICAL: The "execute_sql" function is missing in Database.');
                console.log(`Please copy the contents of "${fileName}" and run it in your Supabase Dashboard SQL Editor.`);
            }
        } else {
            console.log('SQL executed successfully!');
        }
    } catch (err) {
        console.error('Script Error:', err);
    }
}

applySetup();
