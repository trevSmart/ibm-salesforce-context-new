export const TestData = {
	salesforce: {
		testApexRestResourceData: {
			apexClassOrRestResourceName: 'TestRestResource',
		},
		testUser: process.env.MCP_TEST_USER || 'missing test user in $MCP_TEST_USER',
	}
}
