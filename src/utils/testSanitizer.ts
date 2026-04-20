

import { sanitizeText, detectProblematicCharacters, sanitizeObject } from './textSanitizer';


export function runSanitizationTests() {
  console.log('🧪 Running Text Sanitization Tests...\n');

  const tests = [
    {
      name: 'Smart Quotes',
      input: `"Hello \"World\" with 'single' quotes"`,
      expected: '"Hello "World" with \'single\' quotes"',
    },
    {
      name: 'Em-Dash and En-Dash',
      input: 'Price—$100 or range–values',
      expected: 'Price-$100 or range-values',
    },
    {
      name: 'Emojis',
      input: 'Great product 😀 💰 👍',
      expected: 'Great product',
    },
    {
      name: 'Zero-Width Characters',
      input: 'John\u200BSmith\u200C\u200DCompany',
      expected: 'JohnSmithCompany',
    },
    {
      name: 'Control Characters',
      input: 'Text\x00with\x01binary\x1Fdata',
      expected: 'Textwithbinarydata',
    },
    {
      name: 'Special Bullets and Symbols',
      input: '• Item 1\n‣ Item 2\n◦ Item 3',
      expected: '* Item 1\n* Item 2\n* Item 3',
    },
    {
      name: 'Copyright and Trademark',
      input: 'Company© Product™ Registered®',
      expected: 'Company(c) Product(TM) Registered(R)',
    },
    {
      name: 'Ellipsis',
      input: 'Loading…',
      expected: 'Loading...',
    },
    {
      name: 'Invalid UTF-8',
      input: 'Text\uFFFDwith\uFFFDcorruption',
      expected: 'Textwithcorruption',
    },
    {
      name: 'Mixed Problems',
      input: '"Smart—quotes" with emoji 😀 and • bullet',
      expected: '"Smart-quotes" with emoji  and * bullet',
    },
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach((test, index) => {
    const result = sanitizeText(test.input);
    const detection = detectProblematicCharacters(test.input);
    const success = result === test.expected;

    if (success) {
      passed++;
      console.log(`✅ Test ${index + 1}: ${test.name}`);
    } else {
      failed++;
      console.error(`❌ Test ${index + 1}: ${test.name}`);
      console.error(`   Input:    "${test.input}"`);
      console.error(`   Expected: "${test.expected}"`);
      console.error(`   Got:      "${result}"`);
    }

    if (detection.hasProblems) {
      console.log(`   Problems: ${detection.problems.join(', ')}`);
    }
    console.log('');
  });

  console.log('═'.repeat(80));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Sanitization is working correctly.');
  } else {
    console.error('⚠️ Some tests failed. Check the implementation.');
  }

  return { passed, failed };
}


export function testObjectSanitization() {
  console.log('🧪 Testing Object Sanitization...\n');

  const testObject = {
    customerName: '"Smart Company"—Inc.',
    address: 'Street• Building',
    products: [
      { name: 'Product 😀', price: 100 },
      { name: 'Item™', price: 200 },
    ],
    notes: {
      description: 'Great…really great',
      contact: 'John\u200BSmith',
    },
  };

  console.log('Original object:', testObject);

  const cleaned = sanitizeObject(testObject);

  console.log('\nCleaned object:', cleaned);

  console.log('\n✅ Object sanitization complete!');
  console.log('   All nested strings have been cleaned.');

  return cleaned;
}


export function testRealWorldData() {
  console.log('🧪 Testing Real-World Form Data...\n');

  const formData = {
    payload: {
      headerTitle: '"ABC Company"—Service Agreement',
      customerName: 'ABC Company™',
      headerRows: [
        { label: 'Contact', value: 'John\u200BSmith' },
        { label: 'Email', value: 'john@company•com' },
      ],
      products: {
        smallProducts: [
          {
            displayName: 'Hand Soap – 1L',
            qty: 10,
            unitPrice: 5.99,
          },
          {
            displayName: 'Sanitizer 😷',
            qty: 5,
            unitPrice: 12.99,
          },
        ],
      },
      summary: {
        notes: 'Important notes…\nContact us™',
      },
    },
  };

  console.log('Before sanitization:');
  console.log(JSON.stringify(formData, null, 2));

  const cleaned = sanitizeObject(formData);

  console.log('\nAfter sanitization:');
  console.log(JSON.stringify(cleaned, null, 2));


  const before = JSON.stringify(formData);
  const after = JSON.stringify(cleaned);

  if (before !== after) {
    console.log(`\n⚠️ Data was modified: ${before.length - after.length} bytes removed`);
  } else {
    console.log('\n✅ Data was already clean (no changes)');
  }

  return cleaned;
}


if (typeof window !== 'undefined') {
  (window as any).testSanitization = {
    runTests: runSanitizationTests,
    testObject: testObjectSanitization,
    testRealWorld: testRealWorldData,
    sanitizeText,
    detectProblems: detectProblematicCharacters,
    sanitizeObject,
  };

  console.log('💡 Sanitization test utilities loaded!');
  console.log('   Run in console:');
  console.log('   - testSanitization.runTests()');
  console.log('   - testSanitization.testObject()');
  console.log('   - testSanitization.testRealWorld()');
}
