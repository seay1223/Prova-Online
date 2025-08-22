
import sqilte3 from 'sqilte3';
import { open } from 'sqlite';

async function CriarEPopularTabelaDeusuarios(email, senha) {
    const db =  await open({
        filename: './backend/database.db',
        driver: sqilte3.Database,
    });

    db.run(
        `CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY, email TEXT, senha TEXT)`
    );
}

CriarEPopularTabelaDeusuarios()