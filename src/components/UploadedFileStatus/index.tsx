import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { Box, LinearProgress } from '@mui/material';
import FontAwesomeIcon from '../FontAwesomeIcon';

interface UploadedFileStatus {
    size: {
        width: number;
        heigth: number;
    };
    isFileLoaded: boolean;
    secondCondition: boolean;
    fileName?: string;
    fileSize: string;
    fileType: string;
    fileIcon: IconDefinition;
    className: string;
    multipleFiles?: number;
}

const LinearIndeterminate = () => {
    return (
        <Box sx={{ width: '100%' }}>
            <LinearProgress />
        </Box>
    );
};

const UploadedFileStatus = ({
    size,
    isFileLoaded,
    secondCondition,
    fileName,
    fileSize,
    fileType,
    fileIcon,
    className,
    multipleFiles,
}: UploadedFileStatus) => {
    const { width, heigth } = size;

    return (
        <div className={className}>
            <FontAwesomeIcon
                icon={fileIcon}
                width={width}
                height={heigth}
                color={isFileLoaded ? '#A3B763' : 'rgba(0, 0, 0, 0.12)'}
            />
            <div className="file-uploading-status">
                {!isFileLoaded ? (
                    <>
                        <p className="status-text">Выберите файл</p>
                    </>
                ) : secondCondition ? (
                    <>
                        <p className="status-text">В процессе</p>
                        <LinearIndeterminate />
                    </>
                ) : (
                    <>
                        <p className="status-text">
                            Файл загружен{multipleFiles! > 1 ? `(${multipleFiles})` : <></>}
                        </p>
                        <p className="file-name-text">{fileName}</p>
                        <p className="file-name-text">{`${fileSize}, ${fileType}`}</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default UploadedFileStatus;
