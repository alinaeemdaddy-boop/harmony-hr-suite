
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

async function fix() {
    try {
        // 1. Link 'imran' to 'Imran ahmed khan'
        const { data: users } = await supabase.from('app_users').select('id, username');
        const { data: emps } = await supabase.from('employees').select('id, full_name');

        const imranUser = users.find(u => u.username === 'imran');
        const imranEmp = emps.find(e => e.full_name.toLowerCase().includes('imran'));

        if (imranUser && imranEmp) {
            await supabase.from('app_users').update({ employee_id: imranEmp.id }).eq('id', imranUser.id);
            console.log(`Linked user 'imran' to employee '${imranEmp.full_name}'`);
        }

        // 2. Link 'admin' to first employee as fallback
        const adminUser = users.find(u => u.username === 'admin');
        if (adminUser && emps.length > 0) {
            await supabase.from('app_users').update({ employee_id: emps[0].id }).eq('id', adminUser.id);
            console.log(`Linked user 'admin' to employee '${emps[0].full_name}'`);
        }

        // 3. Link 'raza' if exists
        const razaUser = users.find(u => u.username === 'raza');
        if (razaUser && emps.length > 1) {
            await supabase.from('app_users').update({ employee_id: emps[1].id }).eq('id', razaUser.id);
            console.log(`Linked user 'raza' to employee '${emps[1].full_name}'`);
        }

    } catch (e) {
        console.error('Catch:', e);
    }
}

fix();
