// Test script to verify the clear analytics functionality
const { AnalyticsCollector } = require('./dist/src/lib/analytics.js');
const { generateSampleAnalyticsData } = require('./dist/src/lib/generateSampleData.js');

console.log('Testing Clear Analytics Functionality');
console.log('=====================================');

// Step 1: Generate some sample data
console.log('\n1. Generating sample data...');
generateSampleAnalyticsData();

// Step 2: Check that data exists
console.log('\n2. Checking data exists...');
const dataBeforeClear = AnalyticsCollector.getAllAnalytics();
console.log(`   - Games before clear: ${dataBeforeClear.length}`);

if (dataBeforeClear.length === 0) {
  console.log('   ❌ No data found after generation!');
  process.exit(1);
} else {
  console.log('   ✅ Sample data generated successfully');
}

// Step 3: Clear all data
console.log('\n3. Clearing all analytics data...');
AnalyticsCollector.clearAnalytics();

// Step 4: Verify data is cleared
console.log('\n4. Verifying data is cleared...');
const dataAfterClear = AnalyticsCollector.getAllAnalytics();
console.log(`   - Games after clear: ${dataAfterClear.length}`);

if (dataAfterClear.length === 0) {
  console.log('   ✅ All data cleared successfully!');
} else {
  console.log('   ❌ Data still exists after clear!');
  process.exit(1);
}

console.log('\n🎉 Clear analytics functionality test PASSED!');
console.log('\nThe "Clear All Data" button should work correctly in the UI.');
