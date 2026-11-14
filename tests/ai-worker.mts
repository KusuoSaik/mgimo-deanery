import { runLimitedAi } from '../server/aiLimiter.ts';
import { pool } from '../server/stateStore.ts';
try {
 await runLimitedAi(process.env.TEST_USER_KEY || 'test-worker',async()=>{
  process.send?.({event:'enter'});await new Promise(resolve=>setTimeout(resolve,120));process.send?.({event:'leave'});return 'ok';
 });
}finally{await pool?.end();}
