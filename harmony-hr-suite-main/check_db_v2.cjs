
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
    }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function check() {
    try {
        const { data: lt, error: ltE } = await supabase.from('leave_types').select('count');
        console.log('Leave Types:', ltE ? `Error: ${ltE.message}` : 'Exists');

        const { data: lb, error: lbE } = await supabase.from('leave_balances').select('count');
        console.log('Leave Balances:', lbE ? `Error: ${lbE.message}` : 'Exists');

        const { data: cols, error: cE } = await supabase.rpc('get_column_info', { table_name: 'leave_requests' });
        if (cE) {
            // Fallback: try individual selections
            const { error: e1 } = await supabase.from('leave_requests').select('half_day').limit(1);
            console.log('Column half_day:', e1 ? 'Missing' : 'Exists');
            const { error: e2 } = await supabase.from('leave_requests').select('leave_type_id').limit(1);
            console.log('Column leave_type_id:', e2 ? 'Missing' : 'Exists');
        } else {
            console.log('Columns:', cols);
        }
    } catch (e) {
        console.error('Catch:', e);
    }
}

check();
