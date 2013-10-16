<?php

namespace Horde\Socket;

/**
 * Copyright 2013 Horde LLC (http://www.horde.org/)
 *
 * See the enclosed file COPYING for license information (LGPL). If you
 * did not receive this file, see http://www.horde.org/licenses/lgpl21.
 *
 * @category  Horde
 * @copyright 2013 Horde LLC
 * @license   http://www.horde.org/licenses/lgpl21 LGPL 2.1
 * @package   Socket_Client
 */

/**
 * Utility interface for establishing a stream socket client.
 *
 * @author    Michael Slusarz <slusarz@horde.org>
 * @category  Horde
 * @copyright 2013 Horde LLC
 * @license   http://www.horde.org/licenses/lgpl21 LGPL 2.1
 * @package   Socket_Client
 *
 * @property-read boolean $connected  Is there an active connection?
 * @property-read boolean $secure  Is the active connection secure?
 */
class Client
{
    /**
     * Is there an active connection?
     *
     * @var boolean
     */
    protected $_connected = false;

    /**
     * Configuration parameters.
     *
     * @var array
     */
    protected $_params;

    /**
     * Is the connection secure?
     *
     * @var boolean
     */
    protected $_secure = false;

    /**
     * Constructor.
     *
     * @param string $host      Hostname of remote server.
     * @param integer $port     Port number of remote server.
     * @param integer $timeout  Connection timeout (in seconds).
     * @param mixed $secure     Security layer requested. One of:
     * <pre>
     *   - false (No encryption) [DEFAULT]
     *   - 'ssl' (Auto-detect SSL version)
     *   - 'sslv2' (Force SSL version 3)
     *   - 'sslv3' (Force SSL version 2)
     *   - 'tls' (TLS)
     *   - true (TLS if available/necessary)
     * </pre>
     * @param array $params     Additional options.
     *
     * @throws Horde\Socket\Client\Exception
     */
    public function __construct(
        $host, $port, $timeout = 30, $secure = false, array $params = array()
    )
    {
        if ($secure && !extension_loaded('openssl')) {
            if ($secure !== true) {
                throw new \InvalidArgumentException('Secure connections require the PHP openssl extension.');
            }
            $secure = false;
        }

        $this->_params = $params;

        $this->_connect($host, $port, $timeout, $secure);
    }

    /**
     */
    public function __get($name)
    {
        switch ($name) {
        case 'connected':
            return $this->_connected;

        case 'secure':
            return $this->_secure;
        }
    }

    /**
     * This object can not be cloned.
     */
    public function __clone()
    {
        throw new \LogicException('Object cannot be cloned.');
    }

    /**
     * This object can not be serialized.
     */
    public function __sleep()
    {
        throw new \LogicException('Object can not be serialized.');
    }

    /**
     * Start a TLS connection.
     *
     * @return boolean  Whether TLS was successfully started.
     */
    public function startTls()
    {
        if ($this->connected &&
            !$this->secure &&
            (@stream_socket_enable_crypto($this->_stream, true, STREAM_CRYPTO_METHOD_TLS_CLIENT) === true)) {
            $this->_secure = true;
            return true;
        }

        return false;
    }

    /**
     * Close the connection.
     */
    public function close()
    {
        if ($this->connected) {
            @fclose($this->_stream);
            $this->_connected = $this->_secure = false;
            $this->_stream = null;
        }
    }

    /* Internal methods. */

    /**
     * Connect to the remote server.
     *
     * @param string $host      Hostname of remote server.
     * @param integer $port     Port number of remote server.
     * @param integer $timeout  Connection timeout (in seconds).
     * @param mixed $secure     TODO
     *
     * @throws Horde\Socket\Client\Exception
     */
    protected function _connect($host, $port, $timeout, $secure)
    {
        switch (strval($secure)) {
        case 'ssl':
        case 'sslv2':
        case 'sslv3':
            $conn = $secure . '://';
            $this->_secure = true;
            break;

        case 'tls':
        default:
            $conn = 'tcp://';
            break;
        }

        $this->_stream = @stream_socket_client(
            $conn . $host . ':' . $port,
            $error_number,
            $error_string,
            $timeout
        );

        if ($this->_stream === false) {
            $e = new Client\Exception(
                'Error connecting to server.'
            );
            $e->details = sprintf("[%u] %s", $error_number, $error_string);
            throw $e;
        }

        stream_set_timeout($this->_stream, $timeout);

        if (function_exists('stream_set_read_buffer')) {
            stream_set_read_buffer($this->_stream, 0);
        }
        stream_set_write_buffer($this->_stream, 0);

        $this->_connected = true;
    }

}