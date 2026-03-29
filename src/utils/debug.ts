/**
 * Debug utility for checking database status
 * 用于检查数据库状态的调试工具
 */

export async function checkDatabaseStatus(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    // 动态导入数据库模块
    const zoteroDB = await import('../core/database/ZoteroDB').then(m => m.default);

    // 初始化数据库
    await zoteroDB.init();

    // 获取统计信息
    const stats = zoteroDB.getStats();

    // 检查是否有数据
    const items = zoteroDB.query('SELECT COUNT(*) as count FROM items');
    const collections = zoteroDB.query('SELECT COUNT(*) as count FROM collections');
    const tags = zoteroDB.query('SELECT COUNT(*) as count FROM tags');

    return {
      success: true,
      message: 'Database initialized successfully',
      data: {
        items: items[0].count,
        collections: collections[0].count,
        tags: tags[0].count,
        dbSize: stats.size
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      data: error
    };
  }
}

/**
 * Log database status to console
 */
export async function logDatabaseStatus(): Promise<void> {
  const status = await checkDatabaseStatus();
  console.log('=== Database Status ===');
  console.log(`Success: ${status.success}`);
  console.log(`Message: ${status.message}`);
  if (status.data) {
    console.log('Data:', status.data);
  }
  console.log('======================');
}

export default checkDatabaseStatus;