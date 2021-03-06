import test from 'tape'
import nock from 'nock'
import oauth from '../src/oauth'

const mockTokenPayload = JSON.stringify({
    access_token: 'access',
    refresh_token: 'refresh',
    expires_in: 'expires',
    scope: 'users pledges-to-me my-campaign',
    token_type: 'Bearer'
})

const mockInvalidGrant = JSON.stringify({
    error: 'invalid_grant'
})

const mockInvalidClient = JSON.stringify({
    error: 'invalid_client'
})

/**
 * INIT
 */
test('oauth', (assert) => {
    const { getToken, refreshToken } = oauth('id', 'secret')

    assert.equal(typeof getToken, 'function', 'should return getToken function')
    assert.equal(typeof refreshToken, 'function', 'should return refreshToken function')

    assert.end()
})

/**
 * GET TOKENS promisified
 */
test('oauth getToken', (assert) => {
    assert.plan(5)

    const { getToken } = oauth('id', 'secret')

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .reply(200, function (uri, body) {
            const params = (
                'client_id=id&client_secret=secret' +
                '&code=code&grant_type=authorization_code' +
                '&redirect_uri=%2Fredirect'
            )

            assert.equal(body, params, 'params should be sent as form data')

            return mockTokenPayload
        })

    getToken('code', '/redirect')
        .then((res) => {
            assert.ok(res, 'res should be parsed json object')
        })
        .catch((err) => {
            assert.fail('promise failed unexpectedly!')
        })

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .replyWithError('Oh geeze')

    getToken('code', '/redirect')
        .then((res) => {
            assert.fail('promise passed unexpectedly!')
        })
        .catch((err) => {
            assert.notEqual(err, null, 'err should not be null')
        })

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .reply(200, () => { return mockInvalidGrant })

    getToken('code', '/redirect')
        .then((res) => {
            assert.fail('promise passed unexpectedly!')
        })
        .catch((err) => {
            assert.notEqual(err, null, 'err should not be null')
            assert.equal(err.message, 'Invalid grant_type: authorization_code', 'err message should include grant type')
        })
})

/**
 * REFRESH TOKENS promisified
 */
test('oauth refreshToken', (assert) => {
    assert.plan(5)

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .reply(200, function (uri, body) {
            const params = (
                'client_id=id&client_secret=secret&' +
                'refresh_token=token&grant_type=refresh_token'
            )

            assert.equal(body, params, 'params should be sent as form data')

            return mockTokenPayload
        })

    const { refreshToken } = oauth('id', 'secret')

    refreshToken('token')
        .then((res) => {
            assert.ok(res, 'body should be parsed json object')
        })
        .catch((err) => {
            assert.fail('promise failed unexpectedly!')
        })

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .replyWithError('Oh geeze')

    refreshToken('token')
        .then((res) => {
            assert.fail('promise passed unexpectedly!')
        })
        .catch((err) => {
            assert.notEqual(err, null, 'err should not be null')
        })

    nock('https://api.patreon.com')
        .post('/oauth2/token')
        .reply(200, () => { return mockInvalidClient })

    refreshToken('token')
        .then((res) => {
            assert.fail('promise passed unexpectedly!')
        })
        .catch((err) => {
            assert.notEqual(err, null, 'err should not be null')
            assert.equal(err.message, 'Invalid client_id: id', 'err message should client id')
        })
})
